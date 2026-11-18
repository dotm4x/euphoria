import {
  type PlaybackFrame,
  type PlaybackResult,
  type PlaybackStats,
} from '#/audio/descriptors/frame.js'
import { type AudioClip } from '#/audio/resources/clip.js'
import { type ReadOnlyStore } from '#/core/events/store.js'
import { type Identifiable } from '#/core/interfaces/identifiable.js'
import { Destroyable } from '#/core/primitives/destroyable.js'

/** State of the output device behind a backend. */
export enum PlaybackState {
  /** No device was opened yet. */
  idle = 'idle',
  /** The device is open but silent, waiting for a gesture. */
  suspended = 'suspended',
  /** The device is playing. */
  running = 'running',
}

/**
 * Plays the voices a frame describes.
 *
 * A backend is the only part of the engine that needs an audio device. It
 * receives a whole frame, reconciles its voices by identifier and reports what
 * ended, the same way a simulation backend reconciles bodies between steps.
 */
export abstract class AudioBackend extends Destroyable implements Identifiable<string> {
  /** Identifier of the backend, used in diagnostics. */
  public readonly identifier: string

  /** Observable state of the output device. */
  public abstract readonly state: ReadOnlyStore<PlaybackState>

  /** Counters of the device. */
  public abstract readonly stats: PlaybackStats

  /**
   * @param identifier - The nonempty backend identifier.
   * @throws {@link Error} If the identifier is empty.
   */
  protected constructor(identifier: string) {
    super()
    if (!identifier.trim()) {
      throw new Error('An audio backend identifier must not be empty.')
    }

    this.identifier = identifier
  }

  /**
   * Decodes a clip so it can be played.
   *
   * Calling it twice for the same clip resolves immediately after the first
   * decode settles.
   *
   * @param clip - Clip to decode.
   */
  public abstract decode(clip: AudioClip): Promise<void>

  /**
   * Gets the duration of a decoded clip.
   *
   * @param clip - Clip to look up.
   * @returns Duration in seconds, or undefined when the clip is not decoded.
   */
  public abstract duration(clip: AudioClip): number | undefined

  /**
   * Reconciles the voices of the device with a frame.
   *
   * @param frame - Voices, buses and listener of the frame.
   */
  public abstract sync(frame: PlaybackFrame): void

  /**
   * Advances the clock of the backend.
   *
   * @param deltaTime - Elapsed time, in seconds.
   */
  public abstract advance(deltaTime: number): void

  /**
   * Reads the state the device resolved after the last frame.
   *
   * @returns The state of the voices the backend tracks.
   */
  public abstract read(): PlaybackResult

  /** Opens or resumes the device, when the browser allows it. */
  public abstract resume(): Promise<void>

  /** Suspends the device without closing it. */
  public abstract suspend(): Promise<void>
}
