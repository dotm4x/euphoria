import { describe, expect, it } from 'vitest'

import { Bounds3, Vector3 } from '../../../source/index.js'

describe('Bounds3', () => {
  it('exposes its size and center', () => {
    const bounds = new Bounds3(new Vector3(-1, -2, -3), new Vector3(1, 2, 3))

    expect(bounds.size).toEqual(new Vector3(2, 4, 6))
    expect(bounds.center).toEqual(new Vector3(0, 0, 0))
  })

  it('rejects a maximum below the minimum', () => {
    expect(() => new Bounds3(new Vector3(0, 0, 1), new Vector3(1, 1, 0))).toThrow(
      'must not be below',
    )
  })

  it('builds bounds from points and lists the corners', () => {
    const bounds = Bounds3.fromPoints([
      new Vector3(0, 0, 0),
      new Vector3(2, 4, 6),
      new Vector3(-2, 1, 3),
    ])

    expect(bounds.min).toEqual(new Vector3(-2, 0, 0))
    expect(bounds.max).toEqual(new Vector3(2, 4, 6))
    expect(bounds.corners()).toHaveLength(8)
    expect(bounds.corners()[6]).toEqual(new Vector3(2, 4, 6))
    expect(() => Bounds3.fromPoints([])).toThrow('at least one point')
  })

  it('checks containment and intersection', () => {
    const bounds = new Bounds3(new Vector3(0, 0, 0), new Vector3(2, 2, 2))

    expect(bounds.contains(new Vector3(1, 1, 1))).toBe(true)
    expect(bounds.contains(new Vector3(3, 1, 1))).toBe(false)
    expect(bounds.intersects(new Bounds3(new Vector3(1, 1, 1), new Vector3(3, 3, 3)))).toBe(true)
    expect(bounds.intersects(new Bounds3(new Vector3(3, 3, 3), new Vector3(4, 4, 4)))).toBe(false)
  })
})
