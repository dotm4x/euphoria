import {
  type PlaybackFrame,
  type PlaybackResult,
  type PlaybackStats,
  type VoiceState,
} from '#/audio/descriptors/frame.js'
import { type ListenerDescriptor } from '#/audio/descriptors/listener.js'
import { type PlaybackDescriptor } from '#/audio/descriptors/playback.js'
import { Attenuation } from '#/audio/primitives/attenuation.js'
import { AudioSpace } from '#/audio/primitives/space.js'
import { panFor, planarDistance, spatialDistance } from '#/audio/primitives/spatial.js'
import { type AudioClip } from '#/audio/resources/clip.js'
import { type ReadOnlyStore, Store } from '#/core/events/store.js'

import { AudioBackend, PlaybackState } from '../backend.js'

const defaultAttenuation: Attenuation = new Attenuation()

/** Configuration for the Web Audio backend. */
export interface WebAudioBackendOptions {
  /** Context to play through; by default one is created when it is first needed. */
  readonly context?: AudioContext
}

/** A voice the browser is playing. */
interface BrowserVoice {
  readonly clip: AudioClip
  readonly source: AudioBufferSourceNode
  readonly gain: GainNode
  readonly panner: AudioNode | undefined
  loop: boolean
  offset: number
  bus: string
  finished: boolean
  elapsed: number
}

/**
 * Plays through the Web Audio API.
 *
 * Distance and panning are resolved here, not in the nodes: the backend is the
 * only piece that knows how wide the output is. Each voice is a buffer source
 * through a gain node, optionally through a panner, into the gain of its bus.
 *
 * Browsers keep the context suspended until a user gesture, so `resume` must be
 * called from one; the engine reports the state instead of guessing it.
 */
export class WebAudioBackend extends AudioBackend {
  private readonly _state: Store<PlaybackState> = new Store<PlaybackState>(PlaybackState.idle)
  private readonly _buffers: Map<AudioClip, AudioBuffer> = new Map<AudioClip, AudioBuffer>()
  private readonly _pending: Map<AudioClip, Promise<void>> = new Map<AudioClip, Promise<void>>()
  private readonly _buses: Map<string, GainNode> = new Map<string, GainNode>()
  private readonly _routed: Set<string> = new Set<string>()
  private readonly _voices: Map<string, BrowserVoice> = new Map<string, BrowserVoice>()
  private _context: AudioContext | undefined
  private _master: GainNode | undefined

  /**
   * @param options - Context to play through, when the game provides one.
   */
  public constructor({ context }: WebAudioBackendOptions = {}) {
    super('web-audio')
    this._context = context
  }

  /** @inheritDoc */
  public get state(): ReadOnlyStore<PlaybackState> {
    return this._state
  }

  /** @inheritDoc */
  public get stats(): PlaybackStats {
    return {
      voices: this._voices.size,
      buses: this._buses.size,
      clips: this._buffers.size,
    }
  }

  private get context(): AudioContext {
    if (this._context === undefined) {
      const context = Reflect.get(globalThis, 'AudioContext') as typeof AudioContext | undefined
      if (context === undefined) {
        throw new Error('Web Audio is not available in this environment.')
      }

      this._context = new context()
      this._state.value = PlaybackState.suspended
    }

    return this._context
  }

  /** @inheritDoc */
  public decode(clip: AudioClip): Promise<void> {
    const decoded = this._buffers.get(clip)
    if (decoded !== undefined) return Promise.resolve()

    const pending = this._pending.get(clip)
    if (pending !== undefined) return pending

    const promise = this.context.decodeAudioData(clip.data.slice(0)).then((buffer) => {
      this._buffers.set(clip, buffer)
      this._pending.delete(clip)
      this.openDevice()
    })

    this._pending.set(clip, promise)

    return promise
  }

  /** @inheritDoc */
  public duration(clip: AudioClip): number | undefined {
    return this._buffers.get(clip)?.duration ?? clip.duration
  }

  /** @inheritDoc */
  public sync(frame: PlaybackFrame): void {
    if (frame.voices.length > 0) this.openDevice()
    const master = this._master
    if (master === undefined) return

    master.gain.value = frame.muted ? 0 : frame.masterVolume
    this.placeListener(frame.listener)
    this.syncBuses(frame, master)

    const active = new Set<string>()
    for (const descriptor of frame.voices) {
      const buffer = this._buffers.get(descriptor.clip)
      if (buffer === undefined) continue

      active.add(descriptor.identifier)
      const existing = this._voices.get(descriptor.identifier)
      if (existing?.finished === true) continue

      const bus = this._buses.get(descriptor.bus) ?? master
      let voice = existing
      if (voice === undefined || needsRestart(voice, descriptor)) {
        if (voice !== undefined) {
          this.stop(voice)
          this.release(voice)
        }

        voice = this.start(descriptor.identifier, descriptor.clip, buffer, descriptor, bus)
      }

      this.update(voice, frame, descriptor)
    }

    for (const [identifier, voice] of this._voices) {
      if (active.has(identifier)) continue
      this.stop(voice)
      this._voices.delete(identifier)
    }
  }

  /** @inheritDoc */
  public advance(deltaTime: number): void {
    for (const voice of this._voices.values()) voice.elapsed += deltaTime
  }

  /** @inheritDoc */
  public read(): PlaybackResult {
    const voices: VoiceState[] = []
    for (const [identifier, voice] of this._voices) {
      if (!voice.finished) continue
      voices.push({ identifier, finished: true, elapsed: voice.elapsed })
      this.release(voice)
      this._voices.delete(identifier)
    }

    return { voices }
  }

  /** @inheritDoc */
  public async resume(): Promise<void> {
    await this.context.resume()
    this._state.value = PlaybackState.running
  }

  /** @inheritDoc */
  public async suspend(): Promise<void> {
    const context = this._context
    if (context === undefined) return
    await context.suspend()
    this._state.value = PlaybackState.suspended
  }

  protected override onDestroy(): void {
    for (const voice of this._voices.values()) {
      this.stop(voice)
      this.release(voice)
    }

    this._voices.clear()
    this._buses.clear()
    this._routed.clear()
    this._buffers.clear()
    this._pending.clear()
    this._master = undefined
    if (!this._state.destroyed) this._state.destroy()
    const context = this._context
    this._context = undefined
    if (context === undefined || context.state === 'closed') return
    context.close().catch(() => undefined)
  }

  private openDevice(): void {
    if (this._master !== undefined) return
    const context = this.context
    const master = context.createGain()
    master.gain.value = 1
    master.connect(context.destination)
    this._master = master
  }

  private syncBuses(frame: PlaybackFrame, master: GainNode): void {
    const context = this.context
    for (const descriptor of frame.buses) {
      let bus = this._buses.get(descriptor.identifier)
      if (bus === undefined) {
        bus = context.createGain()
        this._buses.set(descriptor.identifier, bus)
      }

      if (!this._routed.has(descriptor.identifier)) {
        bus.connect(this._buses.get(descriptor.parent) ?? master)
        this._routed.add(descriptor.identifier)
      }

      bus.gain.value = descriptor.muted ? 0 : descriptor.volume
    }
  }

  private start(
    identifier: string,
    clip: AudioClip,
    buffer: AudioBuffer,
    descriptor: PlaybackDescriptor,
    destination: AudioNode,
  ): BrowserVoice {
    const context = this.context
    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = descriptor.loop
    source.playbackRate.value = descriptor.pitch

    const gain = context.createGain()
    const panner = this.createPanner(descriptor.space)
    source.connect(gain)
    if (panner === undefined) {
      gain.connect(destination)
    } else {
      gain.connect(panner)
      panner.connect(destination)
    }

    const voice: BrowserVoice = {
      clip,
      source,
      gain,
      panner,
      loop: descriptor.loop,
      offset: descriptor.offset,
      bus: descriptor.bus,
      finished: false,
      elapsed: descriptor.offset,
    }

    source.onended = () => {
      voice.finished = true
    }

    source.start(0, Math.min(descriptor.offset, Math.max(0, buffer.duration - 0.001)))
    this._voices.set(identifier, voice)

    return voice
  }

  private update(
    voice: BrowserVoice | undefined,
    frame: PlaybackFrame,
    descriptor: PlaybackDescriptor,
  ): void {
    if (voice === undefined) return
    const master = this._master
    if (master === undefined) return

    const listener = frame.listener
    const distance =
      descriptor.space === AudioSpace.planar
        ? planarDistance(descriptor.position, listener.position)
        : spatialDistance(descriptor.position, listener.position)
    const curve = descriptor.attenuation ?? defaultAttenuation
    const attenuation = descriptor.space === AudioSpace.none ? 1 : curve.gainAt(distance)

    voice.gain.gain.value = this.clampGain(descriptor.gain * attenuation)
    voice.source.playbackRate.value = descriptor.pitch
    voice.source.loop = descriptor.loop

    const bus = this._buses.get(descriptor.bus) ?? master
    if (voice.bus !== descriptor.bus) {
      if (voice.panner === undefined) {
        voice.gain.disconnect()
        voice.gain.connect(bus)
      } else {
        voice.panner.disconnect()
        voice.panner.connect(bus)
      }

      voice.bus = descriptor.bus
    }

    if (voice.panner === undefined) return
    this.place(voice.panner, descriptor, frame)
  }

  private placeListener(listener: ListenerDescriptor): void {
    const context = this.context
    const ears = context.listener as unknown as PositionedAudio
    const { position, forward, up } = listener
    const time = context.currentTime
    if (hasEarParams(ears)) {
      ears.positionX.setValueAtTime(position.x, time)
      ears.positionY.setValueAtTime(position.y, time)
      ears.positionZ.setValueAtTime(position.z, time)
      ears.forwardX.setValueAtTime(forward.x, time)
      ears.forwardY.setValueAtTime(forward.y, time)
      ears.forwardZ.setValueAtTime(forward.z, time)
      ears.upX.setValueAtTime(up.x, time)
      ears.upY.setValueAtTime(up.y, time)
      ears.upZ.setValueAtTime(up.z, time)

      return
    }

    // Browsers without audio params, such as Firefox and older Safari, only
    // offer the deprecated setters.
    ears.setPosition?.(position.x, position.y, position.z)
    ears.setOrientation?.(forward.x, forward.y, forward.z, up.x, up.y, up.z)
  }

  private place(panner: AudioNode, descriptor: PlaybackDescriptor, frame: PlaybackFrame): void {
    if (descriptor.space === AudioSpace.planar && 'pan' in panner) {
      const listener = frame.listener
      const pan = panFor(descriptor.position, listener.position, listener.forward, listener.up)
      ;(panner as StereoPannerNode).pan.value = pan
      return
    }

    const node = panner as unknown as PositionedAudio
    const { position, forward } = descriptor
    const time = this.context.currentTime
    if (hasSourceParams(node)) {
      node.positionX.setValueAtTime(position.x, time)
      node.positionY.setValueAtTime(position.y, time)
      node.positionZ.setValueAtTime(position.z, time)
      node.orientationX.setValueAtTime(forward.x, time)
      node.orientationY.setValueAtTime(forward.y, time)
      node.orientationZ.setValueAtTime(forward.z, time)

      return
    }

    node.setPosition?.(position.x, position.y, position.z)
    node.setOrientation?.(forward.x, forward.y, forward.z)
  }

  private createPanner(space: AudioSpace): AudioNode | undefined {
    const context = this.context
    if (space === AudioSpace.spatial) {
      const panner = context.createPanner()
      // Distance is applied by the gain node, so the panner only places the voice.
      panner.panningModel = 'HRTF'
      panner.distanceModel = 'linear'
      panner.refDistance = 1
      panner.maxDistance = 10000
      panner.rolloffFactor = 0

      return panner
    }

    if (space === AudioSpace.planar && typeof context.createStereoPanner === 'function') {
      return context.createStereoPanner()
    }

    return undefined
  }

  private stop(voice: BrowserVoice): void {
    try {
      voice.source.stop()
    } catch {
      // A source that never started throws on stop; the voice is released either way.
    }
  }

  private release(voice: BrowserVoice): void {
    voice.source.onended = null
    voice.source.disconnect()
    voice.gain.disconnect()
    voice.panner?.disconnect()
  }

  private clampGain(gain: number): number {
    if (!Number.isFinite(gain)) return 0

    return Math.min(1, Math.max(0, gain))
  }
}

/**
 * Whether a voice must be rebuilt for a descriptor.
 *
 * @param voice - Voice the device is playing.
 * @param descriptor - Description of the voice for this frame.
 * @returns Whether the clip, the loop or the offset changed.
 */
function needsRestart(voice: BrowserVoice, descriptor: PlaybackDescriptor): boolean {
  return (
    voice.clip !== descriptor.clip ||
    voice.loop !== descriptor.loop ||
    voice.offset !== descriptor.offset
  )
}

/** Position and orientation of a listener or a panner, in both API shapes. */
interface PositionedAudio {
  readonly positionX?: AudioParam
  readonly positionY?: AudioParam
  readonly positionZ?: AudioParam
  readonly orientationX?: AudioParam
  readonly orientationY?: AudioParam
  readonly orientationZ?: AudioParam
  readonly forwardX?: AudioParam
  readonly forwardY?: AudioParam
  readonly forwardZ?: AudioParam
  readonly upX?: AudioParam
  readonly upY?: AudioParam
  readonly upZ?: AudioParam
  setPosition?: (x: number, y: number, z: number) => void
  setOrientation?: (
    forwardX: number,
    forwardY: number,
    forwardZ: number,
    upX?: number,
    upY?: number,
    upZ?: number,
  ) => void
}

/**
 * Whether a listener exposes the audio param API for its position and facing.
 *
 * @param target - Listener to inspect.
 * @returns Whether the params are available.
 */
function hasEarParams(target: PositionedAudio): target is EarParams {
  return target.positionX !== undefined && target.forwardX !== undefined && target.upX !== undefined
}

/**
 * Whether a panner exposes the audio param API for its position and facing.
 *
 * @param target - Panner to inspect.
 * @returns Whether the params are available.
 */
function hasSourceParams(target: PositionedAudio): target is SourceParams {
  return target.positionX !== undefined && target.orientationX !== undefined
}

/** Parameters of a listener, as browsers that implement the modern API expose them. */
interface EarParams {
  readonly positionX: AudioParam
  readonly positionY: AudioParam
  readonly positionZ: AudioParam
  readonly forwardX: AudioParam
  readonly forwardY: AudioParam
  readonly forwardZ: AudioParam
  readonly upX: AudioParam
  readonly upY: AudioParam
  readonly upZ: AudioParam
}

/** Parameters of a panner, as browsers that implement the modern API expose them. */
interface SourceParams {
  readonly positionX: AudioParam
  readonly positionY: AudioParam
  readonly positionZ: AudioParam
  readonly orientationX: AudioParam
  readonly orientationY: AudioParam
  readonly orientationZ: AudioParam
}
