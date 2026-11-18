import {
  type PlaybackFrame,
  type PlaybackResult,
  type PlaybackStats,
  type VoiceState,
} from '#/audio/descriptors/frame.js'
import { type AudioClip } from '#/audio/resources/clip.js'
import { type ReadOnlyStore, Store } from '#/core/events/store.js'

import { AudioBackend, PlaybackState } from '../backend.js'

/**
 * A backend that plays nothing and remembers everything.
 *
 * It lets a test run the engine headless and assert which sounds a game asked
 * for, and it lets a server step a game that has no device at all.
 */
export class NullAudioBackend extends AudioBackend {
  private readonly _state: Store<PlaybackState> = new Store<PlaybackState>(PlaybackState.idle)
  private readonly _decoded: Set<AudioClip> = new Set<AudioClip>()
  private readonly _finished: string[] = []
  private readonly _elapsed: Map<string, number> = new Map<string, number>()

  /** Frames the backend received, in order. */
  public readonly frames: PlaybackFrame[] = []

  /** Total time advanced, in seconds. */
  public elapsed: number = 0

  public constructor() {
    super('null')
  }

  /** @inheritDoc */
  public get state(): ReadOnlyStore<PlaybackState> {
    return this._state
  }

  /** @inheritDoc */
  public get stats(): PlaybackStats {
    return { voices: this.active.length, buses: 0, clips: this._decoded.size }
  }

  /** Last frame the backend received. */
  public get frame(): PlaybackFrame | undefined {
    return this.frames.at(-1)
  }

  /** Identifiers of the voices of the last frame. */
  public get active(): readonly string[] {
    return (this.frame?.voices ?? []).map((voice) => voice.identifier)
  }

  /** @inheritDoc */
  public decode(clip: AudioClip): Promise<void> {
    this._decoded.add(clip)

    return Promise.resolve()
  }

  /** @inheritDoc */
  public duration(clip: AudioClip): number | undefined {
    return this._decoded.has(clip) ? clip.duration : undefined
  }

  /** @inheritDoc */
  public sync(frame: PlaybackFrame): void {
    this.frames.push(frame)
  }

  /** @inheritDoc */
  public advance(deltaTime: number): void {
    this.elapsed += deltaTime
    for (const voice of this.frame?.voices ?? []) {
      this._elapsed.set(voice.identifier, (this._elapsed.get(voice.identifier) ?? 0) + deltaTime)
    }
  }

  /** @inheritDoc */
  public read(): PlaybackResult {
    const finished = this._finished.splice(0)
    const voices: VoiceState[] = finished.map((identifier) => {
      const elapsed = this._elapsed.get(identifier) ?? 0
      this._elapsed.delete(identifier)

      return { identifier, finished: true, elapsed }
    })

    return { voices }
  }

  /**
   * Reports that a voice reached its end, as a device would.
   *
   * @param identifier - Identifier of the voice that ended.
   */
  public finish(identifier: string): void {
    this._finished.push(identifier)
  }

  /** @inheritDoc */
  public resume(): Promise<void> {
    this._state.value = PlaybackState.running

    return Promise.resolve()
  }

  /** @inheritDoc */
  public suspend(): Promise<void> {
    this._state.value = PlaybackState.suspended

    return Promise.resolve()
  }

  /** Whether a clip was decoded by this backend. */
  public isDecoded(clip: AudioClip): boolean {
    return this._decoded.has(clip)
  }

  protected override onDestroy(): void {
    if (!this._state.destroyed) this._state.destroy()
    this._decoded.clear()
    this._elapsed.clear()
  }
}
