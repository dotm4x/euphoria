import { describe, expect, it } from 'vitest'

import {
  BodyDescriptor3D,
  ColliderDescriptor3D,
  createSphereShape3D,
  MotionType,
  Vector3,
} from '../../../../source/index.js'

describe('BodyDescriptor3D', () => {
  it('describes an idle body in space by default', () => {
    const body = new BodyDescriptor3D({
      identifier: 'body',
      motion: MotionType.dynamic,
      position: new Vector3(1, 2, 3),
    })

    expect(body.rotation).toEqual(new Vector3(0, 0, 0))
    expect(body.linearVelocity).toEqual(new Vector3(0, 0, 0))
    expect(body.angularVelocity).toEqual(new Vector3(0, 0, 0))
    expect(body.force).toEqual(new Vector3(0, 0, 0))
    expect(body.torque).toEqual(new Vector3(0, 0, 0))
    expect(body.colliders).toEqual([])
    expect(body.sleepAllowed).toBe(true)
    expect(body.teleport).toBe(false)
  })

  it('compares bodies by value', () => {
    const collider = new ColliderDescriptor3D({ shape: createSphereShape3D(1) })
    const options = {
      identifier: 'body',
      motion: MotionType.dynamic,
      position: new Vector3(1, 2, 3),
      colliders: [collider],
    }
    const body = new BodyDescriptor3D(options)

    expect(body.equals(new BodyDescriptor3D(options))).toBe(true)
    expect(body.equals(new BodyDescriptor3D({ ...options, rotation: new Vector3(0, 1, 0) }))).toBe(
      false,
    )
    expect(body.equals(new BodyDescriptor3D({ ...options, torque: new Vector3(0, 0, 1) }))).toBe(
      false,
    )
    expect(body.equals(new BodyDescriptor3D({ ...options, motion: MotionType.static }))).toBe(false)
  })

  it('describes colliders in space with a placement and filtering', () => {
    const collider = new ColliderDescriptor3D({
      shape: createSphereShape3D(2),
      offset: new Vector3(0, 1, 0),
    })

    expect(collider.offset).toEqual(new Vector3(0, 1, 0))
    expect(collider.rotation).toEqual(new Vector3(0, 0, 0))
    expect(collider.layer).toBe(1)
    expect(collider.mask).toBe(0xffff)
    expect(
      () => new ColliderDescriptor3D({ shape: createSphereShape3D(1), mask: 0x10000 }),
    ).toThrow(RangeError)
  })
})
