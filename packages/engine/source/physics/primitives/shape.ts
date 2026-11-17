import { type Vector2 } from '#/math/primitives/vectors/vector2.js'
import { type Vector3 } from '#/math/primitives/vectors/vector3.js'

/** A circle, described by its radius. */
export interface CircleShape2D {
  /** Kind used to dispatch on the shape without inspecting its contents. */
  readonly kind: 'circle'
  /** Radius in world units. */
  readonly radius: number
}

/** An axis-aligned box, described by its half extents. */
export interface BoxShape2D {
  /** Kind used to dispatch on the shape without inspecting its contents. */
  readonly kind: 'box'
  /** Half width and half height in world units. */
  readonly halfExtents: Vector2
}

/** A capsule aligned with the vertical axis. */
export interface CapsuleShape2D {
  /** Kind used to dispatch on the shape without inspecting its contents. */
  readonly kind: 'capsule'
  /** Radius of the rounded caps in world units. */
  readonly radius: number
  /** Half length of the straight section, excluding the caps, in world units. */
  readonly halfHeight: number
}

/** A convex polygon, described by its vertices in counter-clockwise order. */
export interface PolygonShape2D {
  /** Kind used to dispatch on the shape without inspecting its contents. */
  readonly kind: 'polygon'
  /** Vertices of the hull in world units. */
  readonly points: readonly Vector2[]
}

/** A line segment with no thickness. */
export interface SegmentShape2D {
  /** Kind used to dispatch on the shape without inspecting its contents. */
  readonly kind: 'segment'
  /** Start of the segment in world units. */
  readonly from: Vector2
  /** End of the segment in world units. */
  readonly to: Vector2
}

/**
 * A backend-independent two-dimensional collision shape.
 *
 * Shapes are immutable values, so a descriptor that keeps the same shape can be
 * compared by reference. Add new shape kinds to this union so backends can
 * dispatch on them exhaustively.
 */
export type Shape2D = BoxShape2D | CapsuleShape2D | CircleShape2D | PolygonShape2D | SegmentShape2D

/**
 * Creates a box shape.
 *
 * @param halfExtents - Half width and half height in world units.
 * @returns A frozen box shape.
 * @throws {@link RangeError} If a half extent is not finite or not positive.
 */
export function createBoxShape2D(halfExtents: Vector2): BoxShape2D {
  if (!Number.isFinite(halfExtents.x) || !Number.isFinite(halfExtents.y)) {
    throw new RangeError('Box shape half extents must be finite.')
  }

  if (halfExtents.x <= 0 || halfExtents.y <= 0) {
    throw new RangeError('Box shape half extents must be positive.')
  }

  return Object.freeze({ kind: 'box', halfExtents })
}

/**
 * Creates a capsule shape.
 *
 * @param radius - Radius of the rounded caps in world units.
 * @param halfHeight - Half length of the straight section, in world units.
 * @returns A frozen capsule shape.
 * @throws {@link RangeError} If a measure is not finite or not positive.
 */
export function createCapsuleShape2D(radius: number, halfHeight: number): CapsuleShape2D {
  if (!Number.isFinite(radius) || !Number.isFinite(halfHeight)) {
    throw new RangeError('Capsule shape measures must be finite.')
  }

  if (radius <= 0 || halfHeight <= 0) {
    throw new RangeError('Capsule shape measures must be positive.')
  }

  return Object.freeze({ kind: 'capsule', radius, halfHeight })
}

/**
 * Creates a circle shape.
 *
 * @param radius - Radius in world units.
 * @returns A frozen circle shape.
 * @throws {@link RangeError} If the radius is not finite or not positive.
 */
export function createCircleShape2D(radius: number): CircleShape2D {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError('Circle shape radius must be finite and positive.')
  }

  return Object.freeze({ kind: 'circle', radius })
}

/**
 * Creates a convex polygon shape.
 *
 * @param points - Vertices of the hull, in counter-clockwise order.
 * @returns A frozen polygon shape with frozen vertices.
 * @throws {@link RangeError} If fewer than three vertices are given.
 */
export function createPolygonShape2D(points: Iterable<Vector2>): PolygonShape2D {
  const vertices = Object.freeze([...points])
  if (vertices.length < 3) {
    throw new RangeError('Polygon shape requires at least three vertices.')
  }

  return Object.freeze({ kind: 'polygon', points: vertices })
}

/**
 * Creates a segment shape.
 *
 * @param from - Start of the segment in world units.
 * @param to - End of the segment in world units.
 * @returns A frozen segment shape.
 */
export function createSegmentShape2D(from: Vector2, to: Vector2): SegmentShape2D {
  return Object.freeze({ kind: 'segment', from, to })
}

/** An axis-aligned box, described by its half extents in space. */
export interface BoxShape3D {
  /** Kind used to dispatch on the shape without inspecting its contents. */
  readonly kind: 'box'
  /** Half width, half height and half depth in world units. */
  readonly halfExtents: Vector3
}

/** A capsule aligned with the vertical axis in space. */
export interface CapsuleShape3D {
  /** Kind used to dispatch on the shape without inspecting its contents. */
  readonly kind: 'capsule'
  /** Radius of the rounded caps in world units. */
  readonly radius: number
  /** Half length of the straight section, excluding the caps, in world units. */
  readonly halfHeight: number
}

/** A convex hull, described by its vertices in space. */
export interface ConvexShape3D {
  /** Kind used to dispatch on the shape without inspecting its contents. */
  readonly kind: 'convex'
  /** Vertices of the hull in world units. */
  readonly points: readonly Vector3[]
}

/** A sphere, described by its radius. */
export interface SphereShape3D {
  /** Kind used to dispatch on the shape without inspecting its contents. */
  readonly kind: 'sphere'
  /** Radius in world units. */
  readonly radius: number
}

/**
 * A backend-independent three-dimensional collision shape.
 *
 * Shapes are immutable values, so a descriptor that keeps the same shape can be
 * compared by reference. Add new shape kinds to this union so backends can
 * dispatch on them exhaustively.
 */
export type Shape3D = BoxShape3D | CapsuleShape3D | ConvexShape3D | SphereShape3D

/**
 * Creates a box shape in space.
 *
 * @param halfExtents - Half width, half height and half depth in world units.
 * @returns A frozen box shape.
 * @throws {@link RangeError} If a half extent is not finite or not positive.
 */
export function createBoxShape3D(halfExtents: Vector3): BoxShape3D {
  const { x, y, z } = halfExtents
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    throw new RangeError('Box shape half extents must be finite.')
  }

  if (x <= 0 || y <= 0 || z <= 0) {
    throw new RangeError('Box shape half extents must be positive.')
  }

  return Object.freeze({ kind: 'box', halfExtents })
}

/**
 * Creates a capsule shape in space.
 *
 * @param radius - Radius of the rounded caps in world units.
 * @param halfHeight - Half length of the straight section, in world units.
 * @returns A frozen capsule shape.
 * @throws {@link RangeError} If a measure is not finite or not positive.
 */
export function createCapsuleShape3D(radius: number, halfHeight: number): CapsuleShape3D {
  if (!Number.isFinite(radius) || !Number.isFinite(halfHeight)) {
    throw new RangeError('Capsule shape measures must be finite.')
  }

  if (radius <= 0 || halfHeight <= 0) {
    throw new RangeError('Capsule shape measures must be positive.')
  }

  return Object.freeze({ kind: 'capsule', radius, halfHeight })
}

/**
 * Creates a convex hull shape.
 *
 * @param points - Vertices of the hull in world units.
 * @returns A frozen shape with frozen vertices.
 * @throws {@link RangeError} If fewer than four vertices are given or a coordinate is not finite.
 */
export function createConvexShape3D(points: Iterable<Vector3>): ConvexShape3D {
  const vertices = Object.freeze([...points])
  if (vertices.length < 4) {
    throw new RangeError('Convex shape requires at least four vertices.')
  }

  for (const point of vertices) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) {
      throw new RangeError('Convex shape vertices must be finite.')
    }
  }

  return Object.freeze({ kind: 'convex', points: vertices })
}

/**
 * Creates a sphere shape.
 *
 * @param radius - Radius in world units.
 * @returns A frozen sphere shape.
 * @throws {@link RangeError} If the radius is not finite or not positive.
 */
export function createSphereShape3D(radius: number): SphereShape3D {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError('Sphere shape radius must be finite and positive.')
  }

  return Object.freeze({ kind: 'sphere', radius })
}
