import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { type Shape2D } from '../../primitives/shape.js'

/** A polyline in local units, with its closing segment implied by `closed`. */
export interface Outline2D {
  /** Vertices of the polyline. */
  readonly points: readonly Vector2[]
  /** Whether the last vertex connects to the first one. */
  readonly closed: boolean
}

/** Default number of segments used to approximate curved shapes. */
export const defaultOutlineQuality = 24

/**
 * Approximates a collision shape with polylines.
 *
 * Outlines are pure geometry: they describe the shape the same way a backend
 * reads it, without depending on rendering or simulation.
 *
 * @param shape - The shape to outline.
 * @param quality - Number of segments used for curves; defaults to {@link defaultOutlineQuality}.
 * @returns The polylines of the outline, in local units.
 */
export function outlineShape2D(
  shape: Shape2D,
  quality: number = defaultOutlineQuality,
): readonly Outline2D[] {
  const segments = Math.max(3, Math.floor(quality))
  switch (shape.kind) {
    case 'box': {
      const { x, y } = shape.halfExtents

      return [
        {
          points: [new Vector2(-x, -y), new Vector2(x, -y), new Vector2(x, y), new Vector2(-x, y)],
          closed: true,
        },
      ]
    }

    case 'capsule': {
      return [capsule(shape.radius, shape.halfHeight, segments)]
    }

    case 'circle': {
      return [circle(shape.radius, segments)]
    }

    case 'polygon': {
      return [{ points: shape.points, closed: true }]
    }

    case 'segment': {
      return [{ points: [shape.from, shape.to], closed: false }]
    }
  }

  throw new Error('Unsupported shape kind.')
}

function circle(radius: number, segments: number): Outline2D {
  const points: Vector2[] = []
  for (let index = 0; index < segments; index++) {
    const angle = (index / segments) * Math.PI * 2
    points.push(new Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius))
  }

  return { points, closed: true }
}

function capsule(radius: number, halfHeight: number, segments: number): Outline2D {
  const half = Math.max(2, Math.floor(segments / 2))
  const points: Vector2[] = []
  for (let index = 0; index <= half; index++) {
    const angle = (index / half) * Math.PI
    points.push(new Vector2(Math.cos(angle) * radius, halfHeight + Math.sin(angle) * radius))
  }

  for (let index = 1; index < half; index++) {
    const angle = Math.PI + (index / half) * Math.PI
    points.push(new Vector2(Math.cos(angle) * radius, -halfHeight + Math.sin(angle) * radius))
  }

  return { points, closed: true }
}
