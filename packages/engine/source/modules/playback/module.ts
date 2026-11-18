import { BusDescriptor } from '#/audio/descriptors/bus.js'
import {
  type PlaybackResult,
  type PlaybackStats,
  type VoiceState,
} from '#/audio/descriptors/frame.js'
import { ListenerDescriptor } from '#/audio/descriptors/listener.js'
import { type PlaybackDescriptor } from '#/audio/descriptors/playback.js'
import {
  isPlayable,
  type Listener,
  type Playable,
  type PlaybackEntry,
} from '#/audio/interfaces/playable.js'
import { AudioVoice, type AudioVoiceOptions } from '#/audio/nodes/voice.js'
import { AudioSpace } from '#/audio/primitives/space.js'
import { type AudioBus } from '#/audio/resources/bus.js'
import { type AudioClip } from '#/audio/resources/clip.js'
import { collectNodeSound } from '#/audio/traversal.js'
import { IdentifiableSet } from '#/core/collections/identifiable-set.js'
import { ReactiveSet } from '#/core/collections/reactive-set.js'
import { type ReadOnlyStore, Store } from '#/core/events/store.js'
import { Module, type ModuleDependency, ModuleState } from '#/core/module.js'
import { Node } from '#/core/node/node.js'
import { Once } from '#/core/primitives/once.js'
import { Vector3 } from '#/math/primitives/vectors/vector3.js'

import { type UpdateContext } from '../time/context.js'
import { type Updatable } from '../time/interfaces/updatable.js'

import { type AudioBackend, type PlaybackState } from './backends/backend.js'

/** Configuration for the playback module. */
export interface PlaybackModuleOptions {
  /** Backend whose ownership transfers to the module. */
  readonly backend: AudioBackend
  /** Initial entries whose ownership stays with the caller. */
  readonly entries?: Iterable<PlaybackEntry>
  /** Active listener; by default the first one found among the entries. */
  readonly listener?: Listener
  /** Buses whose ownership transfers to the module. */
  readonly buses?: Iterable<AudioBus>
  /** Gain applied to every voice; defaults to `1`. */
  readonly masterVolume?: number
  /** Whether every voice is silenced; defaults to false. */
  readonly muted?: boolean
  /** Voices that may sound at once, or a non-positive value for no limit; defaults to `32`. */
  readonly maxVoices?: number
  /** Required and optional module dependencies. */
  readonly dependencies?: Iterable<ModuleDependency>
}

/** Options of a voice played without a node. */
export interface OneShotOptions extends AudioVoiceOptions {
  /** Position of the voice, when it is placed; defaults to the origin. */
  readonly position?: Vector3
  /** Space the voice is placed in; defaults to none. */
  readonly space?: AudioSpace
}

/**
 * A voice the module owns, used for sounds played without a node.
 *
 * It is a `Playable` like any other, so it travels the same collection and
 * reconciliation path and needs no special case in the frame.
 */
class OneShotVoice implements Playable {
  /** @inheritDoc */
  public readonly identifier: string = crypto.randomUUID()

  private readonly _voice: AudioVoice
  private readonly _position: Vector3
  private readonly _space: AudioSpace
  private _finished: boolean = false

  public constructor(clip: AudioClip, { position, space, ...options }: OneShotOptions) {
    this._position = position ?? new Vector3(0, 0, 0)
    this._space = space ?? AudioSpace.none
    this._voice = new AudioVoice({ ...options, clip })
    this._voice.play()
  }

  /** Whether the voice already reached its end. */
  public get finished(): boolean {
    return this._finished
  }

  /** Whether the voice is still sounding. */
  public get playing(): ReadOnlyStore<boolean> {
    return this._voice.playing
  }

  /** @inheritDoc */
  public describe(): PlaybackDescriptor | undefined {
    return this._voice.describe({
      identifier: this.identifier,
      space: this._space,
      position: this._position,
    })
  }

  /** @inheritDoc */
  public notifyVoice(state: VoiceState): void {
    this._voice.notify(state)
    if (!this._voice.playing.value) this._finished = true
  }

  /** Stops the voice and releases its state. */
  public stop(): void {
    this._voice.stop()
    this._finished = true
    this._voice.destroy()
  }

  /** Releases the state of a voice that already ended. */
  public release(): void {
    if (!this._voice.destroyed) this._voice.destroy()
  }
}

/**
 * Sounds the entries of the game through an audio backend, once per update.
 *
 * Entries describe themselves and the backend reconciles the voices, so the
 * module never knows whether the output is Web Audio, a null device or a future
 * native mixer. Clips decode on demand: the first frame that needs one starts
 * decoding it and the voice joins the mix as soon as it is ready.
 */
export class PlaybackModule extends Module implements Updatable {
  private readonly _preparation: Once = new Once(
    'Playback module preparation has already failed or is in progress.',
  )

  private readonly _decoding: Set<AudioClip> = new Set<AudioClip>()
  private readonly _oneShots: Set<OneShotVoice> = new Set<OneShotVoice>()
  private readonly _voices: Store<readonly PlaybackDescriptor[]> = new Store<
    readonly PlaybackDescriptor[]
  >([])

  private readonly _error: Store<Error | undefined> = new Store<Error | undefined>(undefined)

  private _discovered: Listener | undefined

  /** Backend owned by the module. */
  public readonly backend: AudioBackend

  /** Entries sounded by the module; their ownership stays with the caller. */
  public readonly entries: ReactiveSet<PlaybackEntry>

  /** Buses owned by the module. */
  public readonly buses: IdentifiableSet<AudioBus>

  /** Gain applied to every voice. */
  public readonly masterVolume: Store<number>

  /** Whether every voice is silenced. */
  public readonly muted: Store<boolean>

  /** Voices that may sound at once; a non-positive value means no limit. */
  public readonly maxVoices: Store<number>

  /** Active listener, or undefined to use the first one found among the entries. */
  public readonly listener: Store<Listener | undefined>

  /** Voices of the last frame, as the module sent them to the backend. */
  public readonly voices: ReadOnlyStore<readonly PlaybackDescriptor[]> = this._voices

  /**
   * Last failure of the output device, if any.
   *
   * A device that cannot open is a missing feature, not a broken game, so the
   * module reports it here and keeps the rest of the frame running.
   */
  public readonly error: ReadOnlyStore<Error | undefined> = this._error

  /**
   * @param options - Backend, entries, listener, buses and mixing settings.
   * @throws {@link RangeError} If the master volume or the voice limit is invalid.
   */
  public constructor({
    backend,
    entries = [],
    listener,
    buses = [],
    masterVolume = 1,
    muted = false,
    maxVoices = 32,
    dependencies = [],
  }: PlaybackModuleOptions) {
    super({ identifier: 'org.js.euphoria.PlaybackModule', dependencies })
    if (!Number.isFinite(masterVolume) || masterVolume < 0) {
      throw new RangeError('Playback master volume must be finite and non-negative.')
    }

    if (!Number.isInteger(maxVoices)) {
      throw new RangeError('Playback voice limit must be an integer.')
    }

    this.backend = backend
    this.entries = new ReactiveSet(entries)
    this.buses = new IdentifiableSet(buses)
    this.masterVolume = new Store(masterVolume)
    this.muted = new Store(muted)
    this.maxVoices = new Store(maxVoices)
    this.listener = new Store(listener)
  }

  /** Observable state of the output device. */
  public get deviceState(): ReadOnlyStore<PlaybackState> {
    return this.backend.state
  }

  /** Counters of the output device. */
  public get stats(): PlaybackStats {
    return this.backend.stats
  }

  /**
   * Plays a clip without a node and returns its voice.
   *
   * @param clip - Clip to play; decoding starts on demand.
   * @param options - Gain, pitch, loop, bus, position and space of the voice.
   * @returns The voice, which can be stopped by the caller.
   */
  public play(clip: AudioClip, options: OneShotOptions = {}): Playable {
    this.throwIfDestroyed()
    const voice = new OneShotVoice(clip, options)
    this._oneShots.add(voice)

    return voice
  }

  /** Stops every voice the module played without a node. */
  public stopAll(): void {
    for (const voice of this._oneShots) voice.stop()
    this._oneShots.clear()
    this._voices.value = []
  }

  /**
   * Decodes clips ahead of the frame that needs them.
   *
   * @param clips - Clips to decode.
   */
  public async preload(clips: Iterable<AudioClip>): Promise<void> {
    this.throwIfDestroyed()
    await Promise.all([...clips].map((clip) => this.decode(clip)))
  }

  /** Opens or resumes the output device. Call it from a user gesture. */
  public async resume(): Promise<void> {
    this.throwIfDestroyed()
    try {
      await this.backend.resume()
      this._error.value = undefined
    } catch (error) {
      this._error.value = asError(error)
    }
  }

  /** Suspends the output device, keeping it open. */
  public async suspend(): Promise<void> {
    this.throwIfDestroyed()
    try {
      await this.backend.suspend()
    } catch (error) {
      this._error.value = asError(error)
    }
  }

  /** @inheritDoc */
  public update({ deltaTime }: UpdateContext): void {
    this.throwIfDestroyed()
    const playables = [...this.collect(), ...this._oneShots]
    const listener = this.listener.value ?? this._discovered
    const described: { playable: Playable; descriptor: PlaybackDescriptor }[] = []
    for (const playable of playables) {
      const descriptor = playable.describe()
      if (descriptor === undefined) continue
      this.decode(descriptor.clip).catch(() => undefined)
      described.push({ playable, descriptor })
    }

    const voices = this.limit(described.map(({ descriptor }) => descriptor))
    const frame = {
      listener: listener?.describeListener() ?? new ListenerDescriptor(),
      voices,
      buses: [...this.buses].map(
        (bus) =>
          new BusDescriptor({
            identifier: bus.identifier,
            volume: bus.volume.value,
            muted: bus.muted.value,
            parent: bus.parent,
          }),
      ),
      masterVolume: this.masterVolume.value,
      muted: this.muted.value,
    }

    let result: PlaybackResult
    try {
      this.backend.sync(frame)
      this.backend.advance(deltaTime)
      result = this.backend.read()
      if (this._error.value !== undefined) this._error.value = undefined
    } catch (error) {
      // An output device that fails would otherwise stop the whole game loop.
      this._error.value = asError(error)
      this._voices.value = []

      return
    }

    const byIdentifier = new Map(described.map(({ playable }) => [playable.identifier, playable]))
    for (const state of result.voices) {
      const playable = byIdentifier.get(state.identifier)
      playable?.notifyVoice(state)
    }

    for (const voice of this._oneShots) {
      if (!voice.finished) continue
      this._oneShots.delete(voice)
      voice.release()
    }

    this._voices.value = voices
  }

  /**
   * Yields the entries the module sounds, whose ownership stays with the caller.
   *
   * The options and this hook compose the same entries.
   */
  protected *compose(): Generator<PlaybackEntry, void, unknown> {
    // Override to yield entries.
  }

  /** Configures the module once after composition. */
  protected configure(): void {
    // Override to configure the module.
  }

  protected override onStart(): void {
    this._preparation.execute(() => {
      for (const entry of this.compose()) this.entries.add(entry)
      this.configure()
    })
  }

  protected override onStop(): void {
    this.stopAll()
  }

  protected override onDestroy(): void {
    if (!this.state.destroyed && this.state.value !== ModuleState.idle) {
      throw new Error(`Module '${this.identifier}' cannot be destroyed while not idle.`)
    }

    this.stopAll()
    for (const bus of [...this.buses]) {
      if (!bus.destroyed) bus.destroy()
    }

    this.buses.clear()
    this.entries.clear()
    for (const store of [this.masterVolume, this.muted, this.maxVoices, this.listener]) {
      if (!store.destroyed) store.destroy()
    }

    if (!this._error.destroyed) this._error.destroy()
    if (!this._voices.destroyed) this._voices.destroy()
    if (!this.backend.destroyed) this.backend.destroy()
    super.onDestroy()
  }

  private collect(): readonly Playable[] {
    const playables: Playable[] = []
    let discovered: Listener | undefined
    for (const entry of this.entries) {
      if (isPlayable(entry)) {
        playables.push(entry)
        continue
      }

      if (!(entry instanceof Node)) continue
      const found = collectNodeSound(entry, playables)
      if (discovered === undefined && found !== undefined) discovered = found
    }

    if (discovered !== undefined) this._discovered = discovered

    return playables
  }

  private async decode(clip: AudioClip): Promise<void> {
    if (this._decoding.has(clip)) return
    this._decoding.add(clip)
    try {
      await this.backend.decode(clip)
    } catch {
      // A clip that cannot be decoded stays silent; the next attempt is skipped.
    }
  }

  private limit(voices: readonly PlaybackDescriptor[]): readonly PlaybackDescriptor[] {
    const maximum = this.maxVoices.value
    if (maximum <= 0 || voices.length <= maximum) return [...voices].sort(byPriority)

    return [...voices].sort(byPriority).slice(0, maximum)
  }
}

function byPriority(left: PlaybackDescriptor, right: PlaybackDescriptor): number {
  return right.priority - left.priority
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
