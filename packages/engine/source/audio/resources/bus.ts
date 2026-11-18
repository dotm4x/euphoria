import { type ReadOnlyStore, Store } from '#/core/events/store.js'
import { Resource } from '#/core/primitives/resource.js'

/** Identifier of the mixing bus every other bus falls back to. */
export const masterBusIdentifier = 'master'

/** Configuration for a mixing bus. */
export interface AudioBusOptions {
  /** Unique bus identifier, used by voices to route themselves. */
  readonly identifier: string
  /** Initial gain, from `0` to `1` and above; defaults to `1`. */
  readonly volume?: number
  /** Whether the bus is silenced; defaults to false. */
  readonly muted?: boolean
  /** Bus this one routes into; defaults to the master bus. */
  readonly parent?: string
}

/**
 * A named group of voices with its own gain.
 *
 * Buses let a game fade music, interface sounds or a whole category at once.
 * Their gain is observable, so the playback module sees a change in the next
 * frame without being told.
 */
export class AudioBus extends Resource {
  /** Unique bus identifier. */
  public readonly identifier: string

  /** Observable gain of the bus. */
  public readonly volume: Store<number>

  /** Observable mute flag of the bus. */
  public readonly muted: Store<boolean>

  /** Identifier of the bus this one routes into. */
  public readonly parent: string

  /**
   * @param options - Identifier, gain, mute and parent bus.
   * @throws {@link Error} If the identifier is empty, repeated by its parent, or the gain is invalid.
   */
  public constructor({
    identifier,
    volume = 1,
    muted = false,
    parent = masterBusIdentifier,
  }: AudioBusOptions) {
    super()
    if (!identifier.trim()) {
      throw new Error('An audio bus identifier must not be empty.')
    }

    if (identifier === parent) {
      throw new Error(`Audio bus '${identifier}' cannot route into itself.`)
    }

    if (!Number.isFinite(volume) || volume < 0) {
      throw new RangeError('Audio bus volume must be finite and non-negative.')
    }

    this.identifier = identifier
    this.volume = new Store(volume)
    this.muted = new Store(muted)
    this.parent = parent
  }

  /** Read-only view of the gain, for consumers that only listen. */
  public get gain(): ReadOnlyStore<number> {
    return this.volume
  }

  protected override onDestroy(): void {
    if (!this.volume.destroyed) this.volume.destroy()
    if (!this.muted.destroyed) this.muted.destroy()
    super.onDestroy()
  }
}
