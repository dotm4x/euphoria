import { Vector3 } from '#/math/primitives/vectors/vector3.js'

import { type Attenuation } from '../primitives/attenuation.js'
import { AudioSpace } from '../primitives/space.js'
import { masterBusIdentifier } from '../resources/bus.js'
import { type AudioClip } from '../resources/clip.js'

/** Configuration for the description of a playing voice. */
export interface PlaybackDescriptorOptions {
  /** Stable identifier the backend reconciles the voice with. */
  readonly identifier: string
  /** Clip the voice plays. */
  readonly clip: AudioClip
  /** Space the voice is placed in; defaults to none. */
  readonly space?: AudioSpace
  /** Position in world units, used when the voice is placed. */
  readonly position?: Vector3
  /** Direction the voice faces, used for oriented voices. */
  readonly forward?: Vector3
  /** Gain applied before the distance curve; defaults to `1`. */
  readonly gain?: number
  /** Playback rate, where `1` is the recorded pitch; defaults to `1`. */
  readonly pitch?: number
  /** Whether the voice restarts when it reaches its end; defaults to false. */
  readonly loop?: boolean
  /** Offset the voice starts at, in seconds; defaults to zero. */
  readonly offset?: number
  /** Identifier of the bus the voice routes into. */
  readonly bus?: string
  /** Distance curve applied to the voice; defaults to none. */
  readonly attenuation?: Attenuation
  /** Voice priority when the backend limits how many sound at once; defaults to zero. */
  readonly priority?: number
}

/**
 * Describes a voice a backend must be playing this frame.
 *
 * Descriptors are immutable values, so a backend reconciles them by identifier
 * without knowing which node produced them, the same way simulation bodies are
 * reconciled by the backend that steps them.
 */
export class PlaybackDescriptor {
  /** Stable identifier the backend reconciles the voice with. */
  public readonly identifier: string

  /** Clip the voice plays. */
  public readonly clip: AudioClip

  /** Space the voice is placed in. */
  public readonly space: AudioSpace

  /** Position in world units. */
  public readonly position: Vector3

  /** Direction the voice faces. */
  public readonly forward: Vector3

  /** Gain applied before the distance curve. */
  public readonly gain: number

  /** Playback rate of the voice. */
  public readonly pitch: number

  /** Whether the voice restarts when it reaches its end. */
  public readonly loop: boolean

  /** Offset the voice starts at, in seconds. */
  public readonly offset: number

  /** Identifier of the bus the voice routes into. */
  public readonly bus: string

  /** Distance curve applied to the voice, when it is placed. */
  public readonly attenuation: Attenuation | undefined

  /** Voice priority when the backend limits how many sound at once. */
  public readonly priority: number

  /**
   * @param options - Identity, clip and the settings of the voice.
   * @throws {@link RangeError} If the gain, the pitch or the offset is invalid.
   */
  public constructor({
    identifier,
    clip,
    space = AudioSpace.none,
    position = new Vector3(0, 0, 0),
    forward = new Vector3(0, 0, -1),
    gain = 1,
    pitch = 1,
    loop = false,
    offset = 0,
    bus = masterBusIdentifier,
    attenuation,
    priority = 0,
  }: PlaybackDescriptorOptions) {
    if (!Number.isFinite(gain) || gain < 0) {
      throw new RangeError('A playback gain must be finite and non-negative.')
    }

    if (!Number.isFinite(pitch) || pitch <= 0) {
      throw new RangeError('A playback pitch must be finite and positive.')
    }

    if (!Number.isFinite(offset) || offset < 0) {
      throw new RangeError('A playback offset must be finite and non-negative.')
    }

    this.identifier = identifier
    this.clip = clip
    this.space = space
    this.position = position
    this.forward = forward
    this.gain = gain
    this.pitch = pitch
    this.loop = loop
    this.offset = offset
    this.bus = bus
    this.attenuation = attenuation
    this.priority = priority
  }

  /**
   * Compares this description with another by value.
   *
   * @param other - The description to compare with.
   * @param tolerance - Absolute tolerance applied to the numeric settings.
   * @returns Whether both describe the same voice at the same point.
   */
  public equals(other: PlaybackDescriptor, tolerance: number = 1e-6): boolean {
    return (
      this.identifier === other.identifier &&
      this.clip === other.clip &&
      this.space === other.space &&
      this.bus === other.bus &&
      this.loop === other.loop &&
      Math.abs(this.gain - other.gain) <= tolerance &&
      Math.abs(this.pitch - other.pitch) <= tolerance &&
      Math.abs(this.offset - other.offset) <= tolerance &&
      this.position.equals(other.position, tolerance) &&
      this.forward.equals(other.forward, tolerance) &&
      attenuationEquals(this.attenuation, other.attenuation, tolerance)
    )
  }
}

function attenuationEquals(
  left: Attenuation | undefined,
  right: Attenuation | undefined,
  tolerance: number,
): boolean {
  if (left === undefined || right === undefined) return left === right

  return left.equals(right, tolerance)
}
