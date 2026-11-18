import { describe, expect, it } from 'vitest'

import {
  ColliderDescriptor2D,
  createBoxShape2D,
  FixedJoint2D,
  MotionType,
  PhysicsBody2D,
  RapierBackend2D,
  RevoluteJoint2D,
  type SimulableContact2D,
  SimulationSpace2D,
  Vector2,
} from '../../../../../source/index.js'

function createFloor(): PhysicsBody2D {
  return new PhysicsBody2D({
    motion: MotionType.static,
    position: new Vector2(0, 10),
    colliders: [new ColliderDescriptor2D({ shape: createBoxShape2D(new Vector2(10, 0.5)) })],
  })
}

function createBox(position: Vector2): PhysicsBody2D {
  return new PhysicsBody2D({
    position,
    colliders: [new ColliderDescriptor2D({ shape: createBoxShape2D(new Vector2(0.5, 0.5)) })],
  })
}

describe('RapierBackend2D', () => {
  it('resolves a falling box on a static floor', async () => {
    const backend = await RapierBackend2D.create()
    const floor = createFloor()
    const box = createBox(new Vector2(0, 5))
    const space = new SimulationSpace2D({
      identifier: 'space',
      gravity: new Vector2(0, 9.81),
      entries: [floor, box],
    })
    floor.load()
    box.load()

    let contacts = 0
    space.onContact.connect(() => contacts++)

    for (let step = 0; step < 240; step++) space.step(backend, 1 / 60)

    expect(backend.stats.bodies).toBe(2)
    expect(backend.stats.colliders).toBe(2)
    expect(contacts).toBeGreaterThan(0)
    expect(box.position.value.y).toBeCloseTo(9, 1)
    expect(box.sleeping.value).toBe(true)
    box.destroy()
    floor.destroy()
    space.destroy()
    backend.destroy()
  })

  it('removes the bodies that disappear from the space', async () => {
    const backend = await RapierBackend2D.create()
    const floor = createFloor()
    const box = createBox(new Vector2(0, 3))
    const space = new SimulationSpace2D({
      identifier: 'space',
      gravity: new Vector2(0, 9.81),
      entries: [floor, box],
    })
    floor.load()
    box.load()
    space.step(backend, 1 / 60)
    expect(backend.stats.bodies).toBe(2)

    box.destroy()
    space.step(backend, 1 / 60)

    expect(backend.stats.bodies).toBe(1)
    expect(backend.stats.colliders).toBe(1)
    floor.destroy()
    space.destroy()
    backend.destroy()
  })

  it('only reports dynamic bodies back to the space', async () => {
    const backend = await RapierBackend2D.create()
    const floor = createFloor()
    const box = createBox(new Vector2(0, 5))
    const space = new SimulationSpace2D({
      identifier: 'space',
      gravity: new Vector2(0, 9.81),
      entries: [floor, box],
    })
    floor.load()
    box.load()

    space.step(backend, 1 / 60)

    expect(floor.position.value).toEqual(new Vector2(0, 10))
    expect(box.position.value.y).toBeGreaterThan(5)
    box.destroy()
    floor.destroy()
    space.destroy()
    backend.destroy()
  })

  it('keeps a jointed body at a fixed distance from its pivot', async () => {
    const backend = await RapierBackend2D.create()
    const pivot = new PhysicsBody2D({
      motion: MotionType.static,
      position: new Vector2(0, 0),
      colliders: [new ColliderDescriptor2D({ shape: createBoxShape2D(new Vector2(0.05, 0.05)) })],
    })
    const bob = new PhysicsBody2D({
      position: new Vector2(1, 0),
      colliders: [new ColliderDescriptor2D({ shape: createBoxShape2D(new Vector2(0.2, 0.2)) })],
    })
    const space = new SimulationSpace2D({
      identifier: 'space',
      gravity: new Vector2(0, 9.81),
      entries: [pivot, bob],
    })
    space.joints.add(
      new RevoluteJoint2D({
        body: pivot.identifier,
        other: bob.identifier,
        otherAnchor: new Vector2(-1, 0),
      }),
    )
    pivot.load()
    bob.load()

    for (let step = 0; step < 120; step++) space.step(backend, 1 / 60)

    expect(bob.position.value.distanceTo(new Vector2(0, 0))).toBeCloseTo(1, 1)
    bob.destroy()
    pivot.destroy()
    space.destroy()
    backend.destroy()
  })

  it('casts rays against the colliders of the world', async () => {
    const backend = await RapierBackend2D.create()
    const floor = createFloor()
    const box = createBox(new Vector2(0, 5))
    const space = new SimulationSpace2D({
      identifier: 'space',
      gravity: new Vector2(0, 9.81),
      entries: [floor, box],
    })
    floor.load()
    box.load()
    space.step(backend, 1 / 60)

    const down = space.castRay(new Vector2(0, 3), new Vector2(0, 1), 20)
    expect(down?.body).toBe(box.identifier)
    expect(down?.distance).toBeCloseTo(1.5, 2)
    expect(down?.normal.y).toBeCloseTo(-1, 3)

    const excluded = space.castRay(new Vector2(0, 3), new Vector2(0, 1), 20, {
      excludeBody: box.identifier,
    })
    expect(excluded?.body).toBe(floor.identifier)
    expect(excluded?.distance).toBeCloseTo(6.5, 2)
    expect(space.castRay(new Vector2(0, 3), new Vector2(1, 0), 20)).toBeUndefined()
    box.destroy()
    floor.destroy()
    space.destroy()
    backend.destroy()
  })

  it('keeps jointed bodies in their relative pose when their colliders overlap', async () => {
    const backend = await RapierBackend2D.create()
    const first = new PhysicsBody2D({
      motion: MotionType.static,
      colliders: [new ColliderDescriptor2D({ shape: createBoxShape2D(new Vector2(0.5, 0.5)) })],
    })
    const second = new PhysicsBody2D({
      colliders: [new ColliderDescriptor2D({ shape: createBoxShape2D(new Vector2(0.5, 0.5)) })],
    })
    const space = new SimulationSpace2D({
      identifier: 'space',
      gravity: new Vector2(0, 9.81),
      entries: [first, second],
    })
    space.joints.add(new FixedJoint2D({ body: first.identifier, other: second.identifier }))
    first.load()
    second.load()

    for (let step = 0; step < 120; step++) space.step(backend, 1 / 60)

    expect(second.position.value.distanceTo(new Vector2(0, 0))).toBeLessThan(0.05)
    second.destroy()
    first.destroy()
    space.destroy()
    backend.destroy()
  })

  it('moves a heavier body less with the same impulse', async () => {
    const backend = await RapierBackend2D.create()
    const light = new PhysicsBody2D({
      gravityScale: 0,
      mass: 1,
      position: new Vector2(0, 0),
      colliders: [new ColliderDescriptor2D({ shape: createBoxShape2D(new Vector2(0.5, 0.5)) })],
    })
    const heavy = new PhysicsBody2D({
      gravityScale: 0,
      mass: 10,
      position: new Vector2(0, 20),
      colliders: [new ColliderDescriptor2D({ shape: createBoxShape2D(new Vector2(0.5, 0.5)) })],
    })
    const space = new SimulationSpace2D({
      identifier: 'space',
      gravity: new Vector2(0, 0),
      entries: [light, heavy],
    })
    light.load()
    heavy.load()
    light.applyImpulse(new Vector2(4, 0))
    heavy.applyImpulse(new Vector2(4, 0))

    for (let step = 0; step < 10; step++) space.step(backend, 1 / 60)

    expect(light.position.value.x).toBeGreaterThan(heavy.position.value.x * 5)
    light.destroy()
    heavy.destroy()
    space.destroy()
    backend.destroy()
  })

  it('spins an explicit inertia as slowly as it asks', async () => {
    const backend = await RapierBackend2D.create()
    const free = new PhysicsBody2D({
      gravityScale: 0,
      mass: 1,
      angularDamping: 0,
      position: new Vector2(0, 0),
      colliders: [new ColliderDescriptor2D({ shape: createBoxShape2D(new Vector2(0.5, 0.5)) })],
    })
    const heavy = new PhysicsBody2D({
      gravityScale: 0,
      mass: 1,
      inertia: 50,
      angularDamping: 0,
      position: new Vector2(0, 20),
      colliders: [new ColliderDescriptor2D({ shape: createBoxShape2D(new Vector2(0.5, 0.5)) })],
    })
    const space = new SimulationSpace2D({
      identifier: 'space',
      gravity: new Vector2(0, 0),
      entries: [free, heavy],
    })
    free.load()
    heavy.load()
    for (let step = 0; step < 30; step++) {
      free.applyTorque(6)
      heavy.applyTorque(6)
      space.step(backend, 1 / 60)
    }

    expect(Math.abs(free.rotation.value)).toBeGreaterThan(Math.abs(heavy.rotation.value) * 3)
    free.destroy()
    heavy.destroy()
    space.destroy()
    backend.destroy()
  })

  it('reports the points, the normal and the impulse of a resting contact', async () => {
    const backend = await RapierBackend2D.create()
    const floor = createFloor()
    const box = createBox(new Vector2(0, 5))
    const space = new SimulationSpace2D({
      identifier: 'space',
      gravity: new Vector2(0, 9.81),
      entries: [floor, box],
    })
    floor.load()
    box.load()
    const contacts: SimulableContact2D[] = []
    box.onContact.connect((contact) => contacts.push(contact))

    for (let step = 0; step < 120; step++) space.step(backend, 1 / 60)

    const resting = box.touching.value
    expect(resting.length).toBeGreaterThan(0)
    expect(resting[0]?.other).toBe(floor)
    expect(resting[0]?.touching).toBe(true)
    const [point] = resting[0]?.points ?? []
    expect(point).toBeDefined()
    // The floor sits below the box, so the contact pushes the box up (-y).
    expect(point?.normal.y).toBeLessThan(-0.9)
    expect(point?.impulse).toBeGreaterThan(0)
    expect(box.isTouching()).toBe(true)
    // The sensor-free floor starts touching once, and the box reports it.
    expect(contacts.filter((contact) => contact.started)).toHaveLength(1)
    box.destroy()
    floor.destroy()
    space.destroy()
    backend.destroy()
  })
})
