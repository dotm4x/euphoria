import { type Vector3 } from '#/math/primitives/vectors/vector3.js'

/**
 * The resolved state of a body in space after one or more simulation steps.
 *
 * States are produced by a backend and applied back to the objects that
 * produced the corresponding body.
 */
export interface BodyState3D {
  /** Identifier of the body this state belongs to. */
  readonly identifier: string
  /** Position of the body origin in world units. */
  readonly position: Vector3
  /** Rotation of the body as roll, pitch and yaw, in radians. */
  readonly rotation: Vector3
  /** Linear velocity in world units per second. */
  readonly linearVelocity: Vector3
  /** Angular velocity in radians per second. */
  readonly angularVelocity: Vector3
  /** Whether the simulation put the body to sleep. */
  readonly sleeping: boolean
}
