import { describe, expect, it } from 'vitest'

import {
  createBoxShape2D,
  createCapsuleShape2D,
  createCircleShape2D,
  createPolygonShape2D,
  createSegmentShape2D,
  outlineShape2D,
  Vector2,
} from '../../../../source/index.js'

describe('outlineShape2D', () => {
  it('outlines a box with its four corners', () => {
    const [outline] = outlineShape2D(createBoxShape2D(new Vector2(1, 2)))

    expect(outline?.closed).toBe(true)
    expect(outline?.points).toEqual([
      new Vector2(-1, -2),
      new Vector2(1, -2),
      new Vector2(1, 2),
      new Vector2(-1, 2),
    ])
  })

  it('approximates curves with the requested quality', () => {
    const [circle] = outlineShape2D(createCircleShape2D(1), 8)
    const [capsule] = outlineShape2D(createCapsuleShape2D(1, 2), 8)

    expect(circle?.points).toHaveLength(8)
    expect(capsule?.closed).toBe(true)
    const heights = (capsule?.points ?? []).map((point) => point.y)
    expect(Math.max(...heights)).toBeCloseTo(3, 6)
    expect(Math.min(...heights)).toBeCloseTo(-3, 6)
    for (const point of circle?.points ?? []) {
      expect(Math.hypot(point.x, point.y)).toBeCloseTo(1, 6)
    }
  })

  it('keeps polygons and segments as they are', () => {
    const shape = createPolygonShape2D([new Vector2(0, 0), new Vector2(1, 0), new Vector2(0, 1)])
    const [polygon] = outlineShape2D(shape)
    const [segment] = outlineShape2D(createSegmentShape2D(new Vector2(0, 0), new Vector2(1, 1)))

    expect(polygon?.points).toBe(shape.points)
    expect(polygon?.closed).toBe(true)
    expect(segment?.closed).toBe(false)
    expect(segment?.points).toHaveLength(2)
  })
})
