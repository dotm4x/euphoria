import { describe, expect, it } from 'vitest'

import {
  BodyDescriptor2D,
  ColliderDescriptor2D,
  createCircleShape2D,
  MotionType,
  Vector2,
} from '../../../../source/index.js'

describe('BodyDescriptor2D', () => {
  it('describes an idle body by default', () => {
    const body = new BodyDescriptor2D({
      identifier: 'body',
      motion: MotionType.dynamic,
      position: new Vector2(1, 2),
    })

    expect(body.rotation).toBe(0)
    expect(body.colliders).toEqual([])
    expect(body.linearVelocity).toEqual(new Vector2(0, 0))
    expect(body.angularVelocity).toBe(0)
    expect(body.gravityScale).toBe(1)
    expect(body.linearDamping).toBe(0)
    expect(body.angularDamping).toBe(0)
    expect(body.ccd).toBe(false)
    expect(body.sleepAllowed).toBe(true)
    expect(body.teleport).toBe(false)
    expect(body.force).toEqual(new Vector2(0, 0))
    expect(body.impulse).toEqual(new Vector2(0, 0))
    expect(body.torque).toBe(0)
    expect(body.angularImpulse).toBe(0)
  })

  it('compares bodies by value', () => {
    const collider = new ColliderDescriptor2D({ shape: createCircleShape2D(1) })
    const options = {
      identifier: 'body',
      motion: MotionType.dynamic,
      position: new Vector2(1, 2),
      colliders: [collider],
    }
    const body = new BodyDescriptor2D(options)

    expect(body.equals(new BodyDescriptor2D(options))).toBe(true)
    expect(body.equals(new BodyDescriptor2D({ ...options, position: new Vector2(1, 3) }))).toBe(
      false,
    )
    expect(body.equals(new BodyDescriptor2D({ ...options, motion: MotionType.static }))).toBe(false)
    expect(body.equals(new BodyDescriptor2D({ ...options, teleport: true }))).toBe(false)
    expect(body.equals(new BodyDescriptor2D({ ...options, impulse: new Vector2(0, 1) }))).toBe(
      false,
    )
    const other = new ColliderDescriptor2D({
      identifier: collider.identifier,
      shape: createCircleShape2D(1),
      mask: 0b1,
    })
    expect(body.equals(new BodyDescriptor2D({ ...options, colliders: [other] }))).toBe(false)
  })

  it('freezes the collider list', () => {
    const body = new BodyDescriptor2D({
      identifier: 'body',
      motion: MotionType.static,
      position: new Vector2(0, 0),
      colliders: [new ColliderDescriptor2D({ shape: createCircleShape2D(1) })],
    })

    expect(Object.isFrozen(body.colliders)).toBe(true)
  })
})
