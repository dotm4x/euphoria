import { type Vector2 } from '#/math/primitives/vectors/vector2.js'
import { type Vector3 } from '#/math/primitives/vectors/vector3.js'

/** One contact point of a two-dimensional collision. */
export interface ContactPoint2D {
  /** World position where both shapes touch. */
  readonly point: Vector2
  /** Unit normal, pointing from the other shape towards this body. */
  readonly normal: Vector2
  /** Impulse the simulation applied along the normal, in newton-seconds. */
  readonly impulse: number
  /** Separation along the normal; negative while the shapes overlap. */
  readonly distance: number
}

/** One contact point of a three-dimensional collision. */
export interface ContactPoint3D {
  /** World position where both shapes touch. */
  readonly point: Vector3
  /** Unit normal, pointing from the other shape towards this body. */
  readonly normal: Vector3
  /** Impulse the simulation applied along the normal, in newton-seconds. */
  readonly impulse: number
  /** Separation along the normal; negative while the shapes overlap. */
  readonly distance: number
}

/**
 * A contact reported by a simulation step.
 *
 * Contacts are produced by a backend after the world advances and are published
 * by the space that owns the bodies involved; the space resolves both sides to
 * the objects that produced the bodies. Sensors report contacts too, without
 * points because they do not generate them.
 */
export interface BodyContact2D {
  /** Identifier of the body involved in the contact. */
  readonly identifier: string
  /** Identifier of the collider of that body, when it has one. */
  readonly collider: string | undefined
  /** Identifier of the other body involved in the contact. */
  readonly other: string
  /** Identifier of the collider of the other body, when it has one. */
  readonly otherCollider: string | undefined
  /** Whether the contact began during this step. */
  readonly started: boolean
  /** Whether both shapes still overlap after this step. */
  readonly touching: boolean
  /** Points of the contact, empty for sensors and for contacts that ended. */
  readonly points: readonly ContactPoint2D[]
}

/** A contact reported by a simulation step in space; see {@link BodyContact2D}. */
export interface BodyContact3D {
  /** Identifier of the body involved in the contact. */
  readonly identifier: string
  /** Identifier of the collider of that body, when it has one. */
  readonly collider: string | undefined
  /** Identifier of the other body involved in the contact. */
  readonly other: string
  /** Identifier of the collider of the other body, when it has one. */
  readonly otherCollider: string | undefined
  /** Whether the contact began during this step. */
  readonly started: boolean
  /** Whether both shapes still overlap after this step. */
  readonly touching: boolean
  /** Points of the contact, empty for sensors and for contacts that ended. */
  readonly points: readonly ContactPoint3D[]
}
