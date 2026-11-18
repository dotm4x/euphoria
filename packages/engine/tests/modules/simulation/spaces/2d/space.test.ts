import { describe, expect, it } from 'vitest'

import {
  BodyDescriptor2D,
  type BodyState2D,
  ColliderDescriptor2D,
  createCircleShape2D,
  Dimension,
  MotionType,
  PhysicsBody2D,
  RevoluteJoint2D,
  type Simulable2D,
  type SimulableContact2D,
  SimulationBackend2D,
  SimulationData2D,
  type SimulationFrame2D,
  type SimulationResult2D,
  SimulationSpace2D,
  type SimulationStats,
  Vector2,
} from '../../../../../source/index.js'

class RecordingBackend extends SimulationBackend2D {
  public override readonly dimension: Dimension = Dimension.twoDimensional
  public readonly events: string[] = []
  public readonly steps: number[] = []
  public frame: SimulationFrame2D | undefined
  public result: SimulationResult2D = { states: [], contacts: [] }

  public constructor() {
    super('recording')
  }

  public get stats(): SimulationStats {
    return { bodies: 0, colliders: 0, steps: this.steps.length, contacts: 0 }
  }

  public sync(frame: SimulationFrame2D): void {
    this.events.push('sync')
    this.frame = frame
  }

  public advance(deltaTime: number): void {
    this.events.push('advance')
    this.steps.push(deltaTime)
  }

  public castRay(): undefined {
    return undefined
  }

  public read(): SimulationResult2D {
    this.events.push('read')
    return this.result
  }
}

class PlainBody implements Simulable2D {
  public states: BodyState2D[] = []
  public readonly contacts: SimulableContact2D[] = []
  private readonly _key: string

  public constructor(key: string = 'plain') {
    this._key = key
  }

  public simulate(): SimulationData2D {
    return new SimulationData2D([
      new BodyDescriptor2D({
        identifier: this._key,
        motion: MotionType.dynamic,
        position: new Vector2(0, 0),
      }),
    ])
  }

  public applyState(state: BodyState2D): void {
    this.states.push(state)
  }

  public notifyContact(contact: SimulableContact2D): void {
    this.contacts.push(contact)
  }
}

describe('SimulationSpace2D', () => {
  it('splits elapsed time into fixed steps around a single synchronization', () => {
    const backend = new RecordingBackend()
    const space = new SimulationSpace2D({ identifier: 'space', fixedDeltaTime: 1 / 60 })

    space.step(backend, 1 / 30)

    expect(backend.events).toEqual(['sync', 'advance', 'advance', 'read'])
    expect(backend.steps).toEqual([1 / 60, 1 / 60])
    expect(space.steps).toBe(2)
    space.destroy()
  })

  it('waits for the accumulated time to reach a step', () => {
    const backend = new RecordingBackend()
    const space = new SimulationSpace2D({ identifier: 'space', fixedDeltaTime: 1 / 60 })

    space.step(backend, 1 / 120)
    expect(backend.events).toEqual([])

    space.step(backend, 1 / 120)
    expect(backend.events).toEqual(['sync', 'advance', 'read'])
    space.destroy()
  })

  it('limits the steps executed per update', () => {
    const backend = new RecordingBackend()
    const space = new SimulationSpace2D({
      identifier: 'space',
      fixedDeltaTime: 1 / 60,
      maxSubSteps: 2,
    })

    space.step(backend, 1)

    expect(backend.steps).toHaveLength(2)
    space.destroy()
  })

  it('does not step a disabled space or an empty update', () => {
    const backend = new RecordingBackend()
    const space = new SimulationSpace2D({ identifier: 'space', enabled: false })

    space.step(backend, 1 / 60)
    space.enabled.value = true
    space.step(backend, 0)

    expect(backend.events).toEqual([])
    space.destroy()
  })

  it('collects node entries, gravity and borrowed plain entries', () => {
    const backend = new RecordingBackend()
    const plain = new PlainBody()
    const space = new SimulationSpace2D({
      identifier: 'space',
      gravity: new Vector2(0, 3),
      entries: [plain],
    })

    space.step(backend, 1 / 60)

    expect(backend.frame?.gravity).toEqual(new Vector2(0, 3))
    expect(backend.frame?.bodies.map((descriptor) => descriptor.identifier)).toEqual(['plain'])
    space.destroy()
  })

  it('applies resolved states and leaves unknown bodies unresolved', () => {
    const backend = new RecordingBackend()
    const plain = new PlainBody('plain')
    const space = new SimulationSpace2D({ identifier: 'space', entries: [plain] })
    const contacts: SimulableContact2D[] = []
    space.onContact.connect((contact) => contacts.push(contact))
    const state = {
      identifier: 'plain',
      position: new Vector2(1, 2),
      rotation: 0,
      linearVelocity: new Vector2(0, 0),
      angularVelocity: 0,
      sleeping: false,
    }
    backend.result = {
      states: [state],
      contacts: [
        {
          identifier: 'plain',
          collider: 'shape',
          other: 'unknown',
          otherCollider: undefined,
          started: true,
          touching: true,
          points: [],
        },
      ],
    }

    space.step(backend, 1 / 60)

    expect(plain.states).toEqual([state])
    expect(contacts).toEqual([
      {
        owner: plain,
        other: undefined,
        collider: 'shape',
        otherCollider: undefined,
        started: true,
        touching: true,
        points: [],
      },
    ])
    space.destroy()
  })

  it('publishes contacts resolved to the objects that own each body', () => {
    const backend = new RecordingBackend()
    const first = new PlainBody('first')
    const second = new PlainBody('second')
    const space = new SimulationSpace2D({ identifier: 'space', entries: [first, second] })
    const seen: SimulableContact2D[] = []
    space.onContact.connect((contact) => seen.push(contact))
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
        {
          identifier: 'second',
          collider: 'b',
          other: 'first',
          otherCollider: 'a',
          started: false,
          touching: true,
          points: [],
        },
      ],
    }

    space.step(backend, 1 / 60)

    expect(seen.map((contact) => [contact.owner, contact.other, contact.started])).toEqual([
      [first, second, true],
      [second, first, false],
    ])
    expect(seen[0]?.collider).toBe('a')
    expect(seen[0]?.otherCollider).toBe('b')
    expect(first.contacts).toEqual([seen[0]])
    expect(second.contacts).toEqual([seen[1]])
    space.destroy()
  })

  it('composes entries and joints, exactly like the options do', () => {
    const backend = new RecordingBackend()
    const plain = new PlainBody('composed')
    const joint = new RevoluteJoint2D({ body: 'a', other: 'b' })
    class ComposingSpace extends SimulationSpace2D {
      protected override *compose(): Generator<RevoluteJoint2D | Simulable2D, void, unknown> {
        yield plain
        yield joint
      }
    }

    const space = new ComposingSpace({ identifier: 'space' })
    space.step(backend, 1 / 60)

    expect(space.entries.has(plain)).toBe(true)
    expect(space.joints.has(joint)).toBe(true)
    expect(backend.frame?.bodies.map((descriptor) => descriptor.identifier)).toEqual(['composed'])
    expect(backend.frame?.joints).toEqual([joint])
    space.destroy()
  })

  it('collects the bodies of a node entry', () => {
    const backend = new RecordingBackend()
    const body = new PhysicsBody2D({
      position: new Vector2(2, 3),
      colliders: [new ColliderDescriptor2D({ shape: createCircleShape2D(1) })],
    })
    const space = new SimulationSpace2D({ identifier: 'space', entries: [body] })
    body.load()

    space.step(backend, 1 / 60)

    expect(backend.frame?.bodies.map((descriptor) => descriptor.identifier)).toEqual([
      body.identifier,
    ])
    expect(backend.frame?.bodies[0]?.position).toEqual(new Vector2(2, 3))
    body.destroy()
    space.destroy()
  })
})
