import { Vector3 } from '#/math/primitives/vectors/vector3.js'

/** Configuration for the description of the listener. */
export interface ListenerDescriptorOptions {
  /** Position of the listener in world units; defaults to the origin. */
  readonly position?: Vector3
  /** Direction the listener faces; defaults to negative Z. */
  readonly forward?: Vector3
  /** Up axis of the listener; defaults to positive Y. */
  readonly up?: Vector3
}

/**
 * Describes where sound is heard from.
 *
 * Only one listener is active at a time. Placed voices calculate their distance
 * and their pan against it, so the listener is the ear of the frame.
 */
export class ListenerDescriptor {
  /** Position of the listener in world units. */
  public readonly position: Vector3

  /** Direction the listener faces. */
  public readonly forward: Vector3

  /** Up axis of the listener. */
  public readonly up: Vector3

  /**
   * @param options - Position, facing direction and up axis.
   */
  public constructor({
    position = new Vector3(0, 0, 0),
    forward = new Vector3(0, 0, -1),
    up = new Vector3(0, 1, 0),
  }: ListenerDescriptorOptions = {}) {
    this.position = position
    this.forward = forward
    this.up = up
  }

  /**
   * Compares this description with another by value.
   *
   * @param other - The description to compare with.
   * @param tolerance - Absolute tolerance applied to the vectors.
   * @returns Whether both describe the same ear.
   */
  public equals(other: ListenerDescriptor, tolerance: number = 1e-6): boolean {
    return (
      this.position.equals(other.position, tolerance) &&
      this.forward.equals(other.forward, tolerance) &&
      this.up.equals(other.up, tolerance)
    )
  }
}
