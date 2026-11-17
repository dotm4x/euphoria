import { type Vector2 } from '#/math/primitives/vectors/vector2.js'

/**
 * The resolved state of a body after one or more simulation steps.
 *
 * States are produced by a backend and applied back to the objects that
 * produced the corresponding body.
 */
export interface BodyState2D {
  /** Identifier of the body this state belongs to. */
  readonly identifier: string
  /** Position of the body origin in world units. */
  readonly position: Vector2
  /** Rotation of the body around its origin, in radians. */
  readonly rotation: number
  /** Linear velocity in world units per second. */
  readonly linearVelocity: Vector2
  /** Angular velocity in radians per second. */
  readonly angularVelocity: number
  /** Whether the simulation put the body to sleep. */
  readonly sleeping: boolean
}
