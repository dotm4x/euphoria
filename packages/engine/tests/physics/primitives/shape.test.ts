import { describe, expect, it } from 'vitest'

import {
  createBoxShape2D,
  createCapsuleShape2D,
  createCircleShape2D,
  createPolygonShape2D,
  createSegmentShape2D,
  Vector2,
} from '../../../source/index.js'

describe('physics shapes', () => {
  it('freezes the shape and its vertices', () => {
    const box = createBoxShape2D(new Vector2(1, 2))
    const polygon = createPolygonShape2D([new Vector2(0, 0), new Vector2(1, 0), new Vector2(0, 1)])

    expect(Object.isFrozen(box)).toBe(true)
    expect(Object.isFrozen(polygon)).toBe(true)
    expect(Object.isFrozen(polygon.points)).toBe(true)
    expect(box).toEqual({ kind: 'box', halfExtents: new Vector2(1, 2) })
    expect(polygon.points).toHaveLength(3)
  })

  it('describes every shape kind through its kind', () => {
    expect(createCircleShape2D(2).kind).toBe('circle')
    expect(createCapsuleShape2D(1, 2).kind).toBe('capsule')
    expect(createSegmentShape2D(new Vector2(0, 0), new Vector2(1, 1)).kind).toBe('segment')
  })

  it('rejects measures that a backend cannot use', () => {
    expect(() => createCircleShape2D(0)).toThrow(RangeError)
    expect(() => createCircleShape2D(Number.POSITIVE_INFINITY)).toThrow(RangeError)
    expect(() => createBoxShape2D(new Vector2(1, -1))).toThrow(RangeError)
    expect(() => createCapsuleShape2D(1, Number.NaN)).toThrow(RangeError)
    expect(() => createPolygonShape2D([new Vector2(0, 0), new Vector2(1, 0)])).toThrow(RangeError)
  })
})
