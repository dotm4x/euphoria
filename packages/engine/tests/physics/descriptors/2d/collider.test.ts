import { describe, expect, it } from 'vitest'

import {
  ColliderDescriptor2D,
  createCircleShape2D,
  defaultCollisionLayer,
  defaultCollisionMask,
  PhysicsMaterial,
  Vector2,
} from '../../../../source/index.js'

describe('ColliderDescriptor2D', () => {
  it('uses a collision layer, mask and placement by default', () => {
    const collider = new ColliderDescriptor2D({ shape: createCircleShape2D(1) })

    expect(collider.identifier).not.toBe('')
    expect(collider.offset).toEqual(new Vector2(0, 0))
    expect(collider.rotation).toBe(0)
    expect(collider.material).toBeUndefined()
    expect(collider.sensor).toBe(false)
    expect(collider.layer).toBe(defaultCollisionLayer)
    expect(collider.mask).toBe(defaultCollisionMask)
  })

  it('compares colliders by value and identity', () => {
    const shape = createCircleShape2D(1)
    const material = new PhysicsMaterial({ friction: 0.2 })
    const options = { identifier: 'collider', shape, material, mask: 0b10 }
    const collider = new ColliderDescriptor2D(options)

    expect(collider.equals(new ColliderDescriptor2D(options))).toBe(true)
    expect(collider.equals(new ColliderDescriptor2D({ ...options, mask: 0b100 }))).toBe(false)
    expect(collider.equals(new ColliderDescriptor2D({ ...options, sensor: true }))).toBe(false)
    expect(collider.equals(new ColliderDescriptor2D({ ...options, identifier: 'other' }))).toBe(
      false,
    )
    material.destroy()
  })

  it('rejects layers and rotations a backend cannot use', () => {
    const shape = createCircleShape2D(1)

    expect(() => new ColliderDescriptor2D({ shape, layer: 0x10000 })).toThrow(RangeError)
    expect(() => new ColliderDescriptor2D({ shape, mask: -1 })).toThrow(RangeError)
    expect(() => new ColliderDescriptor2D({ shape, rotation: Number.NaN })).toThrow(RangeError)
  })
})
