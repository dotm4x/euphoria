import { describe, expect, it } from 'vitest'

import {
  ColliderDescriptor3D,
  createBoxShape3D,
  createSphereShape3D,
  MotionType,
  PhysicsBody3D,
  RapierBackend3D,
  RevoluteJoint3D,
  SimulationSpace3D,
  Vector3,
} from '../../../../../source/index.js'

function createGround(): PhysicsBody3D {
  return new PhysicsBody3D({
    motion: MotionType.static,
    position: new Vector3(0, -0.5, 0),
    colliders: [new ColliderDescriptor3D({ shape: createBoxShape3D(new Vector3(10, 0.5, 10)) })],
  })
}

function createBox(position: Vector3): PhysicsBody3D {
  return new PhysicsBody3D({
    position,
    colliders: [new ColliderDescriptor3D({ shape: createBoxShape3D(new Vector3(0.5, 0.5, 0.5)) })],
  })
}

function createSpace(entries: PhysicsBody3D[]): SimulationSpace3D {
  return new SimulationSpace3D({
    identifier: 'space',
    gravity: new Vector3(0, -9.81, 0),
    entries,
  })
}

describe('RapierBackend3D', () => {
  it('resolves a falling box on a static ground', async () => {
    const backend = await RapierBackend3D.create()
    const ground = createGround()
    const box = createBox(new Vector3(0, 5, 0))
    const space = createSpace([ground, box])
    ground.load()
    box.load()
    let contacts = 0
    space.onContact.connect(() => contacts++)

    for (let step = 0; step < 240; step++) space.step(backend, 1 / 60)

    expect(backend.stats.bodies).toBe(2)
    expect(backend.stats.colliders).toBe(2)
    expect(contacts).toBeGreaterThan(0)
    expect(box.position.value.y).toBeCloseTo(0.5, 1)
    expect(box.sleeping.value).toBe(true)
    box.destroy()
    ground.destroy()
    space.destroy()
    backend.destroy()
  })

  it('keeps a jointed body at a fixed distance from its pivot', async () => {
    const backend = await RapierBackend3D.create()
    const pivot = new PhysicsBody3D({
      motion: MotionType.static,
      position: new Vector3(0, 4, 0),
      colliders: [
        new ColliderDescriptor3D({ shape: createBoxShape3D(new Vector3(0.05, 0.05, 0.05)) }),
      ],
    })
    const bob = new PhysicsBody3D({
      position: new Vector3(1, 4, 0),
      colliders: [
        new ColliderDescriptor3D({ shape: createBoxShape3D(new Vector3(0.2, 0.2, 0.2)) }),
      ],
    })
    const space = createSpace([pivot, bob])
    space.joints.add(
      new RevoluteJoint3D({
        body: pivot.identifier,
        other: bob.identifier,
        otherAnchor: new Vector3(-1, 0, 0),
      }),
    )
    pivot.load()
    bob.load()

    for (let step = 0; step < 120; step++) space.step(backend, 1 / 60)

    expect(bob.position.value.y).toBeLessThan(4.2)
    expect(bob.position.value.distanceTo(new Vector3(0, 4, 0))).toBeCloseTo(1, 1)
    bob.destroy()
    pivot.destroy()
    space.destroy()
    backend.destroy()
  })

  it('casts rays against the colliders of the world', async () => {
    const backend = await RapierBackend3D.create()
    const ground = createGround()
    const sphere = new PhysicsBody3D({
      motion: MotionType.static,
      position: new Vector3(0, 2, 0),
      colliders: [new ColliderDescriptor3D({ shape: createSphereShape3D(1) })],
    })
    const space = createSpace([ground, sphere])
    ground.load()
    sphere.load()
    space.step(backend, 1 / 60)

    const down = space.castRay(new Vector3(0, 6, 0), new Vector3(0, -1, 0), 20)
    expect(down?.body).toBe(sphere.identifier)
    expect(down?.distance).toBeCloseTo(3, 3)
    expect(down?.normal.y).toBeCloseTo(1, 3)
    expect(down?.point).toEqual(new Vector3(0, 3, 0))

    const side = space.castRay(new Vector3(5, 2, 0), new Vector3(1, 0, 0), 20)
    expect(side).toBeUndefined()
    const excluded = space.castRay(new Vector3(0, 6, 0), new Vector3(0, -1, 0), 20, {
      excludeBody: sphere.identifier,
    })
    expect(excluded?.body).toBe(ground.identifier)
    sphere.destroy()
    ground.destroy()
    space.destroy()
    backend.destroy()
  })
})
