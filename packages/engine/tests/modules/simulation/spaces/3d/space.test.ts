import { describe, expect, it } from 'vitest'

import {
  BodyDescriptor3D,
  type BodyState3D,
  Dimension,
  FixedJoint3D,
  MotionType,
  PhysicsBody3D,
  type RayHit3D,
  type Simulable3D,
  type SimulableContact3D,
  SimulationBackend3D,
  SimulationData3D,
  type SimulationFrame3D,
  type SimulationResult3D,
  SimulationSpace3D,
  type SimulationStats,
  Vector3,
} from '../../../../../source/index.js'

class RecordingBackend extends SimulationBackend3D {
  public override readonly dimension: Dimension = Dimension.threeDimensional
  public readonly steps: number[] = []
  public readonly rays: unknown[][] = []
  public frame: SimulationFrame3D | undefined
  public result: SimulationResult3D = { states: [], contacts: [] }

  public constructor() {
    super('recording-3d')
  }

  public get stats(): SimulationStats {
    return { bodies: 0, colliders: 0, steps: this.steps.length, contacts: 0 }
  }

  public sync(frame: SimulationFrame3D): void {
    this.frame = frame
  }

  public advance(deltaTime: number): void {
    this.steps.push(deltaTime)
  }

  public read(): SimulationResult3D {
    return this.result
  }

  public castRay(): RayHit3D | undefined {
    this.rays.push([])
    return undefined
  }
}

class PlainBody implements Simulable3D {
  public readonly states: BodyState3D[] = []
  public readonly contacts: SimulableContact3D[] = []
  private readonly _key: string

  public constructor(key: string = 'plain') {
    this._key = key
  }

  public simulate(): SimulationData3D {
    return new SimulationData3D([
      new BodyDescriptor3D({
        identifier: this._key,
        motion: MotionType.dynamic,
        position: new Vector3(0, 0, 0),
      }),
    ])
  }

  public applyState(state: BodyState3D): void {
    this.states.push(state)
  }

  public notifyContact(contact: SimulableContact3D): void {
    this.contacts.push(contact)
  }
}

describe('SimulationSpace3D', () => {
  it('composes entries and joints, exactly like the options do', () => {
    const backend = new RecordingBackend()
    const body = new PhysicsBody3D({ position: new Vector3(0, 4, 0) })
    const ground = new PhysicsBody3D({ motion: MotionType.static })
    const joint = new FixedJoint3D({ body: body.identifier, other: ground.identifier })
    class ComposingSpace extends SimulationSpace3D {
      protected override *compose(): Generator<FixedJoint3D | Simulable3D, void, unknown> {
        yield ground
        yield body
        yield joint
      }
    }

    const space = new ComposingSpace({ identifier: 'space' })
    body.load()
    ground.load()

    space.step(backend, 1 / 60)

    expect(space.entries.has(body)).toBe(true)
    expect(space.joints.has(joint)).toBe(true)
    expect(backend.frame?.bodies.map((descriptor) => descriptor.identifier)).toEqual([
      ground.identifier,
      body.identifier,
    ])
    expect(backend.frame?.joints).toEqual([joint])
    body.destroy()
    ground.destroy()
    space.destroy()
  })

  it('splits elapsed time into fixed steps and collects joints', () => {
    const backend = new RecordingBackend()
    const body = new PhysicsBody3D({ position: new Vector3(0, 4, 0) })
    const ground = new PhysicsBody3D({ motion: MotionType.static })
    const joint = new FixedJoint3D({ body: body.identifier, other: ground.identifier })
    const space = new SimulationSpace3D({
      identifier: 'space',
      gravity: new Vector3(0, -4, 0),
      entries: [ground, body],
      joints: [joint],
    })
    body.load()
    ground.load()

    space.step(backend, 1 / 30)

    expect(backend.steps).toEqual([1 / 60, 1 / 60])
    expect(backend.frame?.gravity).toEqual(new Vector3(0, -4, 0))
    expect(backend.frame?.bodies.map((descriptor) => descriptor.identifier)).toEqual([
      ground.identifier,
      body.identifier,
    ])
    expect(backend.frame?.joints).toEqual([joint])
    body.destroy()
    ground.destroy()
    space.destroy()
  })

  it('applies resolved states to the objects that produced them', () => {
    const backend = new RecordingBackend()
    const plain = new PlainBody()
    const space = new SimulationSpace3D({ identifier: 'space', entries: [plain] })
    const state = {
      identifier: 'plain',
      position: new Vector3(1, 2, 3),
      rotation: new Vector3(0, 1, 0),
      linearVelocity: new Vector3(0, 0, 0),
      angularVelocity: new Vector3(0, 0, 0),
      sleeping: false,
    }
    backend.result = { states: [state], contacts: [] }

    space.step(backend, 1 / 60)

    expect(plain.states).toEqual([state])
    space.destroy()
  })

  it('publishes contacts resolved to the objects that own each body', () => {
    const backend = new RecordingBackend()
    const first = new PlainBody('first')
    const second = new PlainBody('second')
    const space = new SimulationSpace3D({ identifier: 'space', entries: [first, second] })
    backend.result = {
      states: [],
      contacts: [
        {
          identifier: 'first',
          collider: 'a',
          other: 'second',
          otherCollider: 'b',
          started: true,
          touching: true,
          points: [],
        },
      ],
    }

    space.step(backend, 1 / 60)

    expect(first.contacts.map((contact) => [contact.owner, contact.other])).toEqual([
      [first, second],
    ])
    space.destroy()
  })

  it('casts rays through the backend that stepped the space', () => {
    const backend = new RecordingBackend()
    const space = new SimulationSpace3D({ identifier: 'space' })

    expect(() => space.castRay(new Vector3(0, 0, 0), new Vector3(0, 1, 0), 1)).toThrow(/stepped/)

    space.step(backend, 1 / 60)
    space.castRay(new Vector3(0, 0, 0), new Vector3(0, 1, 0), 1)

    expect(backend.rays).toHaveLength(1)
    space.destroy()
  })
})
