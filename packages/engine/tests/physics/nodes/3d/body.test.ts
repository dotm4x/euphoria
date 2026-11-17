import { describe, expect, it } from 'vitest'

import {
  ColliderDescriptor3D,
  createBoxShape3D,
  MotionType,
  Node3D,
  PhysicsBody3D,
  type SimulationContext,
  Vector3,
} from '../../../../source/index.js'

const context: SimulationContext = { deltaTime: 1 / 60, fixedDeltaTime: 1 / 60, step: 0 }

describe('PhysicsBody3D', () => {
  it('describes its transform, motion and colliders', () => {
    const collider = new ColliderDescriptor3D({ shape: createBoxShape3D(new Vector3(1, 1, 1)) })
    const body = new PhysicsBody3D({ position: new Vector3(1, 4, -2), colliders: [collider] })
    body.load()

    const [descriptor] = body.simulate(context).bodies

    expect(descriptor?.identifier).toBe(body.identifier)
    expect(descriptor?.position).toEqual(new Vector3(1, 4, -2))
    expect(descriptor?.colliders).toEqual([collider])
    body.destroy()
  })

  it('reuses the descriptor while nothing changes', () => {
    const body = new PhysicsBody3D()
    body.load()
    const first = body.simulate(context).bodies[0]

    expect(body.simulate(context).bodies[0]).toBe(first)
    body.rotation.value = new Vector3(0, 0.5, 0)
    expect(body.simulate(context).bodies[0]).not.toBe(first)
    body.destroy()
  })

  it('reports accumulated pushes once', () => {
    const body = new PhysicsBody3D()
    body.load()
    body.applyImpulse(new Vector3(1, 0, 0))
    body.applyTorque(new Vector3(0, 1, 0))

    const [pushed] = body.simulate(context).bodies
    const [released] = body.simulate(context).bodies

    expect(pushed?.impulse).toEqual(new Vector3(1, 0, 0))
    expect(pushed?.torque).toEqual(new Vector3(0, 1, 0))
    expect(released?.impulse).toEqual(new Vector3(0, 0, 0))
    expect(released?.torque).toEqual(new Vector3(0, 0, 0))
    body.destroy()
  })

  it('adopts the resolved state and the sleeping flag', () => {
    const body = new PhysicsBody3D()
    body.load()

    body.applyState({
      identifier: body.identifier,
      position: new Vector3(0, -1, 0),
      rotation: new Vector3(0, 1, 0),
      linearVelocity: new Vector3(0, -2, 0),
      angularVelocity: new Vector3(0, 3, 0),
      sleeping: true,
    })

    expect(body.position.value).toEqual(new Vector3(0, -1, 0))
    expect(body.rotation.value).toEqual(new Vector3(0, 1, 0))
    expect(body.linearVelocity.value).toEqual(new Vector3(0, -2, 0))
    expect(body.angularVelocity.value).toEqual(new Vector3(0, 3, 0))
    expect(body.sleeping.value).toBe(true)
    body.destroy()
  })

  it('only teleports static bodies and explicit teleports', () => {
    const fixed = new PhysicsBody3D({ motion: MotionType.static })
    const dynamic = new PhysicsBody3D()
    fixed.load()
    dynamic.load()

    expect(fixed.simulate(context).bodies[0]?.teleport).toBe(true)
    expect(dynamic.simulate(context).bodies[0]?.teleport).toBe(false)
    dynamic.teleport(new Vector3(0, 2, 0))
    expect(dynamic.simulate(context).bodies[0]?.teleport).toBe(true)
    expect(dynamic.simulate(context).bodies[0]?.teleport).toBe(false)
    fixed.destroy()
    dynamic.destroy()
  })

  it('rejects being placed inside a node that transforms space', () => {
    const parent = new Node3D()
    parent.load()
    const body = new PhysicsBody3D()

    expect(() => {
      parent.add(body)
    }).toThrow(/world space/)

    expect(body.parent).toBeUndefined()
    body.destroy()
    parent.destroy()
  })
})
