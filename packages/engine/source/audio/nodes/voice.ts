import { type ReadOnlySignal, Signal } from '#/core/events/signal.js'
import { type ReadOnlyStore, Store } from '#/core/events/store.js'
import { Destroyable } from '#/core/primitives/destroyable.js'
import { Vector3 } from '#/math/primitives/vectors/vector3.js'

import { type VoiceState } from '../descriptors/frame.js'
import { PlaybackDescriptor } from '../descriptors/playback.js'
import { Attenuation } from '../primitives/attenuation.js'
import { type AudioSpace } from '../primitives/space.js'
import { masterBusIdentifier } from '../resources/bus.js'
import { type AudioClip } from '../resources/clip.js'

/** Configuration shared by every sound source of the engine. */
export interface AudioVoiceOptions {
  /** Clip the source plays; can be changed while it sounds. */
  readonly clip?: AudioClip | undefined
  /** Gain of the source, from `0` upwards; defaults to `1`. */
  readonly volume?: number | undefined
  /** Playback rate, where `1` is the recorded pitch; defaults to `1`. */
  readonly pitch?: number | undefined
  /** Whether the source restarts when the clip ends; defaults to false. */
  readonly loop?: boolean | undefined
  /** Identifier of the bus the source routes into; defaults to the master bus. */
  readonly bus?: string | undefined
  /** Distance curve, applied only to placed sources; defaults to inverse from 1 to 30. */
  readonly attenuation?: Attenuation | undefined
  /** Priority used when the module limits how many voices sound at once; defaults to zero. */
  readonly priority?: number | undefined
  /** Whether the source starts sounding as soon as it exists; defaults to false. */
  readonly autoplay?: boolean | undefined
}

/** Where a voice is, when it is placed in space. */
export interface AudioVoicePlacement {
  /** Stable identifier the backend reconciles the voice with. */
  readonly identifier: string
  /** Space the voice is placed in. */
  readonly space: AudioSpace
  /** Position in world units; defaults to the origin. */
  readonly position?: Vector3
  /** Direction the voice faces; defaults to negative Z. */
  readonly forward?: Vector3
}

/**
 * State and behaviour shared by every sound source.
 *
 * Nodes own one and delegate to it, so a player and the planar and spatial
 * emitters do not repeat the same twenty fields. The voice never knows where
 * the listener is: it only describes itself.
 */
export class AudioVoice extends Destroyable {
  private readonly _finished: Signal<[]> = new Signal<[]>()
  private _offset: number = 0

  /** Clip the source plays; undefined keeps it silent. */
  public readonly clip: Store<AudioClip | undefined>

  /** Gain of the source. */
  public readonly volume: Store<number>

  /** Playback rate of the source. */
  public readonly pitch: Store<number>

  /** Whether the source restarts when the clip ends. */
  public readonly loop: Store<boolean>

  /** Identifier of the bus the source routes into. */
  public readonly bus: Store<string>

  /** Distance curve applied to the source when it is placed. */
  public readonly attenuation: Store<Attenuation>

  /** Priority used when the module limits how many voices sound at once. */
  public readonly priority: Store<number>

  /** Whether the source is sounding; the module clears it when the clip ends. */
  public readonly playing: Store<boolean>

  /** Fired when the clip reaches its end and the source is not looping. */
  public readonly onFinished: ReadOnlySignal<[]> = this._finished

  /**
   * @param options - Clip, gain, pitch, loop, bus, distance curve and priority.
   */
  public constructor({
    clip,
    volume = 1,
    pitch = 1,
    loop = false,
    bus = masterBusIdentifier,
    attenuation = new Attenuation(),
    priority = 0,
    autoplay = false,
  }: AudioVoiceOptions = {}) {
    super()
    this.clip = new Store(clip)
    this.volume = new Store(volume)
    this.pitch = new Store(pitch)
    this.loop = new Store(loop)
    this.bus = new Store(bus)
    this.attenuation = new Store(attenuation)
    this.priority = new Store(priority)
    this.playing = new Store(autoplay && clip !== undefined)
  }

  /** Seconds into the clip where the voice starts. */
  public get offset(): number {
    return this._offset
  }

  /** Read-only view of whether the source is sounding. */
  public get active(): ReadOnlyStore<boolean> {
    return this.playing
  }

  /**
   * Starts or restarts the source.
   *
   * @param offset - Second of the clip to start at; defaults to the current offset.
   * @throws {@link Error} If the voice has been destroyed or has no clip.
   */
  public play(offset: number = this._offset): void {
    this.throwIfDestroyed()
    if (this.clip.value === undefined) {
      throw new Error('An audio voice cannot play without a clip.')
    }

    this._offset = Math.max(0, offset)
    this.playing.value = true
  }

  /** Stops the source and rewinds it to the beginning. */
  public stop(): void {
    this.throwIfDestroyed()
    this.playing.value = false
    this._offset = 0
  }

  /**
   * Moves the source to a second of its clip, restarting it when it sounds.
   *
   * @param offset - Second of the clip to continue from.
   * @throws {@link Error} If the voice has been destroyed.
   */
  public seek(offset: number): void {
    this.throwIfDestroyed()
    this._offset = Math.max(0, offset)
  }

  /**
   * Describes this voice for the frame being collected.
   *
   * @param placement - Identifier and position of the source.
   * @returns The description, or undefined when the source is silent.
   */
  public describe(placement: AudioVoicePlacement): PlaybackDescriptor | undefined {
    const clip = this.clip.value
    if (!this.playing.value || clip === undefined) return undefined

    return new PlaybackDescriptor({
      identifier: placement.identifier,
      clip,
      space: placement.space,
      position: placement.position ?? new Vector3(0, 0, 0),
      forward: placement.forward ?? new Vector3(0, 0, -1),
      gain: this.volume.value,
      pitch: this.pitch.value,
      loop: this.loop.value,
      offset: this._offset,
      bus: this.bus.value,
      attenuation: this.attenuation.value,
      priority: this.priority.value,
    })
  }

  /**
   * Receives the state the backend resolved for this voice.
   *
   * @param state - State of the voice after the frame.
   */
  public notify(state: VoiceState): void {
    if (!state.finished) return
    this.playing.value = false
    this._offset = 0
    this._finished.fire()
  }

  protected override onDestroy(): void {
    for (const store of [
      this.clip,
      this.volume,
      this.pitch,
      this.loop,
      this.bus,
      this.attenuation,
      this.priority,
      this.playing,
    ]) {
      if (!store.destroyed) store.destroy()
    }

    if (!this._finished.destroyed) this._finished.destroy()
  }
}
