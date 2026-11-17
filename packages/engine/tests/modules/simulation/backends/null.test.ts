import { describe, expect, it } from 'vitest'

import {
  ColliderDescriptor2D,
  createBoxShape2D,
  MotionType,
  NullSimulationBackend,
  PhysicsBody2D,
  SimulationSpace2D,
  Vector2,
} from '../../../../source/index.js'

function createSpace(entries: PhysicsBody2D[]): SimulationSpace2D {
  return new SimulationSpace2D({ identifier: 'space', entries, fixedDeltaTime: 1 / 60 })
}

describe('NullSimulationBackend', () => {
  it('integrates gravity, forces and damping over fixed steps', () => {
    const backend = new NullSimulationBackend()
    const body = new PhysicsBody2D({
      position: new Vector2(0, 0),
      colliders: [new ColliderDescriptor2D({ shape: createBoxShape2D(new Vector2(1, 1)) })],
    })
    const space = createSpace([body])
    body.load()

    for (let step = 0; step < 60; step++) space.step(backend, 1 / 60)

    expect(backend.stats.steps).toBe(60)
    expect(body.position.value.y).toBeCloseTo(4.99, 1)
    expect(body.linearVelocity.value.y).toBeCloseTo(9.81, 1)
    body.destroy()
    space.destroy()
    backend.destroy()
  })

  it('leaves bodies without gravity scale and static bodies in place', () => {
    const backend = new NullSimulationBackend()
    const floating = new PhysicsBody2D({ gravityScale: 0 })
    const fixed = new PhysicsBody2D({ motion: MotionType.static, position: new Vector2(2, 2) })
    const space = createSpace([floating, fixed])
    floating.load()
    fixed.load()

    for (let step = 0; step < 30; step++) space.step(backend, 1 / 60)

    expect(floating.position.value).toEqual(new Vector2(0, 0))
    expect(fixed.position.value).toEqual(new Vector2(2, 2))
    floating.destroy()
    fixed.destroy()
    space.destroy()
    backend.destroy()
  })

  it('applies impulses as velocity changes and forgets removed bodies', () => {
    const backend = new NullSimulationBackend()
    const body = new PhysicsBody2D({ gravityScale: 0 })
    const space = createSpace([body])
    body.load()

    body.applyImpulse(new Vector2(6, 0))
    space.step(backend, 1 / 60)

    expect(body.linearVelocity.value.x).toBeCloseTo(6, 5)
    expect(backend.stats.bodies).toBe(1)

    body.destroy()
    space.step(backend, 1 / 60)

    expect(backend.stats.bodies).toBe(0)
    space.destroy()
    backend.destroy()
  })
})
