import { masterBusIdentifier } from '../resources/bus.js'

/** Configuration for the description of a mixing bus. */
export interface BusDescriptorOptions {
  /** Unique bus identifier. */
  readonly identifier: string
  /** Gain of the bus; defaults to `1`. */
  readonly volume?: number
  /** Whether the bus is silenced; defaults to false. */
  readonly muted?: boolean
  /** Bus this one routes into; defaults to the master bus. */
  readonly parent?: string
}

/** Describes the state of a mixing bus for one frame. */
export class BusDescriptor {
  /** Unique bus identifier. */
  public readonly identifier: string

  /** Gain of the bus. */
  public readonly volume: number

  /** Whether the bus is silenced. */
  public readonly muted: boolean

  /** Bus this one routes into. */
  public readonly parent: string

  /**
   * @param options - Identifier, gain, mute and parent bus.
   */
  public constructor({
    identifier,
    volume = 1,
    muted = false,
    parent = masterBusIdentifier,
  }: BusDescriptorOptions) {
    this.identifier = identifier
    this.volume = volume
    this.muted = muted
    this.parent = parent
  }

  /**
   * Compares this description with another by value.
   *
   * @param other - The description to compare with.
   * @returns Whether both describe the same bus state.
   */
  public equals(other: BusDescriptor): boolean {
    return (
      this.identifier === other.identifier &&
      this.volume === other.volume &&
      this.muted === other.muted &&
      this.parent === other.parent
    )
  }
}
