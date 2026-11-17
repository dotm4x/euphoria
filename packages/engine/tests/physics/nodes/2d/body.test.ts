import { describe, expect, it } from 'vitest'

import {
  BodyDescriptor2D,
  ColliderDescriptor2D,
  createCircleShape2D,
  MotionType,
  Node2D,
  PhysicsBody2D,
  type SimulationContext,
  Vector2,
} from '../../../../source/index.js'

const context: SimulationContext = { deltaTime: 1 / 60, fixedDeltaTime: 1 / 60, step: 0 }

describe('PhysicsBody2D', () => {
  it('describes its transform, motion and colliders', () => {
    const collider = new ColliderDescriptor2D({ shape: createCircleShape2D(1) })
    const body = new PhysicsBody2D({ position: new Vector2(2, 3), colliders: [collider] })
    body.load()

    const [descriptor] = body.simulate(context).bodies

    expect(descriptor).toBeInstanceOf(BodyDescriptor2D)
    expect(descriptor?.identifier).toBe(body.identifier)
    expect(descriptor?.motion).toBe(MotionType.dynamic)
    expect(descriptor?.position).toEqual(new Vector2(2, 3))
    expect(descriptor?.colliders).toEqual([collider])
    body.destroy()
  })

  it('reuses the descriptor while nothing changes', () => {
    const body = new PhysicsBody2D()
    body.load()
    const first = body.simulate(context).bodies[0]
    const second = body.simulate(context).bodies[0]

    expect(first).toBe(second)
    expect(first?.teleport).toBe(false)
    body.position.value = new Vector2(1, 0)
    expect(body.simulate(context).bodies[0]).not.toBe(first)
    body.destroy()
  })

  it('reports accumulated pushes once', () => {
    const body = new PhysicsBody2D()
    body.load()
    body.applyImpulse(new Vector2(1, 0))
    body.applyForce(new Vector2(0, 2))
    body.applyTorque(3)
    body.applyAngularImpulse(4)

    const [pushed] = body.simulate(context).bodies
    const [released] = body.simulate(context).bodies

    expect(pushed?.impulse).toEqual(new Vector2(1, 0))
    expect(pushed?.force).toEqual(new Vector2(0, 2))
    expect(pushed?.torque).toBe(3)
    expect(pushed?.angularImpulse).toBe(4)
    expect(released?.impulse).toEqual(new Vector2(0, 0))
    expect(released?.force).toEqual(new Vector2(0, 0))
    expect(released?.torque).toBe(0)
    expect(released?.angularImpulse).toBe(0)
    body.destroy()
  })

  it('adopts a teleport exactly once', () => {
    const body = new PhysicsBody2D()
    body.load()
    body.teleport(new Vector2(4, 5), 1)

    const [moved] = body.simulate(context).bodies
    const [settled] = body.simulate(context).bodies

    expect(moved?.position).toEqual(new Vector2(4, 5))
    expect(moved?.rotation).toBe(1)
    expect(moved?.teleport).toBe(true)
    expect(settled?.teleport).toBe(false)
    body.destroy()
  })

  it('adopts the resolved state of dynamic bodies only', () => {
    const dynamic = new PhysicsBody2D()
    const fixed = new PhysicsBody2D({ motion: MotionType.static })
    dynamic.load()
    fixed.load()
    const state = {
      position: new Vector2(1, 2),
      rotation: 0.5,
      linearVelocity: new Vector2(3, 4),
      angularVelocity: 2,
      sleeping: true,
    }

    dynamic.applyState({ identifier: dynamic.identifier, ...state })
    fixed.applyState({ identifier: fixed.identifier, ...state })

    expect(dynamic.position.value).toEqual(new Vector2(1, 2))
    expect(dynamic.rotation.value).toBe(0.5)
    expect(dynamic.linearVelocity.value).toEqual(new Vector2(3, 4))
    expect(dynamic.angularVelocity.value).toBe(2)
    expect(dynamic.sleeping.value).toBe(true)
    expect(fixed.position.value).toEqual(new Vector2(0, 0))
    expect(fixed.rotation.value).toBe(0)
    dynamic.destroy()
    fixed.destroy()
  })

  it('rejects being placed inside a node that transforms space', () => {
    const parent = new Node2D()
    parent.load()
    const body = new PhysicsBody2D()

    expect(() => {
      parent.add(body)
    }).toThrow(/world space/)

    expect(body.parent).toBeUndefined()
    body.destroy()
    parent.destroy()
  })
})
