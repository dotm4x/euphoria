import { describe, expect, it } from 'vitest'

import {
  createBoxShape3D,
  createCapsuleShape3D,
  createConvexShape3D,
  createSphereShape3D,
  Vector3,
} from '../../../../source/index.js'

describe('physics shapes in space', () => {
  it('freezes the shape and its vertices', () => {
    const box = createBoxShape3D(new Vector3(1, 2, 3))
    const convex = createConvexShape3D([
      new Vector3(0, 0, 0),
      new Vector3(1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, 0, 1),
    ])

    expect(Object.isFrozen(box)).toBe(true)
    expect(Object.isFrozen(convex)).toBe(true)
    expect(Object.isFrozen(convex.points)).toBe(true)
    expect(box).toEqual({ kind: 'box', halfExtents: new Vector3(1, 2, 3) })
    expect(convex.points).toHaveLength(4)
  })

  it('describes every shape kind through its kind', () => {
    expect(createSphereShape3D(2).kind).toBe('sphere')
    expect(createCapsuleShape3D(1, 2).kind).toBe('capsule')
  })

  it('rejects measures that a backend cannot use', () => {
    expect(() => createSphereShape3D(0)).toThrow(RangeError)
    expect(() => createBoxShape3D(new Vector3(1, 1, -1))).toThrow(RangeError)
    expect(() => createCapsuleShape3D(Number.NaN, 1)).toThrow(RangeError)
    expect(() =>
      createConvexShape3D([new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(0, 1, 0)]),
    ).toThrow(RangeError)
  })
})
