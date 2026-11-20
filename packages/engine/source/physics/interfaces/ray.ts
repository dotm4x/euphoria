import { type Vector2 } from '#/math/primitives/vectors/vector2.js'

/** Filtering applied to a ray query. */
export interface RayQueryOptions {
  /** Whether a ray starting inside a shape reports the shape; defaults to true. */
  readonly solid?: boolean
  /** Collision layers the ray interacts with, as a 16-bit mask; defaults to all. */
  readonly mask?: number
  /** Identifier of a body to ignore, such as the body casting the ray. */
  readonly excludeBody?: string
}

/** The first collider a two-dimensional ray hits. */
export interface RayHit2D {
  /** Identifier of the body that owns the collider, when it has one. */
  readonly body: string | undefined
  /** Identifier of the collider that was hit. */
  readonly collider: string | undefined
  /** Distance from the ray origin to the hit, in world units. */
  readonly distance: number
  /** Point where the ray and the collider meet, in world units. */
  readonly point: Vector2
  /** Unit normal of the collider surface at the hit. */
  readonly normal: Vector2
}
