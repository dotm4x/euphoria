import { describe, expect, it } from 'vitest'

import {
  type CollectedBody2D,
  collectNodeBodies2D,
  ColliderDescriptor2D,
  createCircleShape2D,
  Node,
  PhysicsBody2D,
  type SimulationContext,
  Vector2,
} from '../../source/index.js'

const context: SimulationContext = { deltaTime: 1 / 60, fixedDeltaTime: 1 / 60, step: 0 }

function createBody(): PhysicsBody2D {
  return new PhysicsBody2D({
    colliders: [new ColliderDescriptor2D({ shape: createCircleShape2D(1) })],
  })
}

describe('collectNodeBodies2D', () => {
  it('collects bodies in hierarchy order with their owners', () => {
    const root = new Node()
    const first = createBody()
    const group = new Node()
    const hidden = createBody()
    hidden.visible.value = false
    const nested = createBody()
    group.add(hidden)
    group.add(nested)
    root.add(first)
    root.add(group)
    root.load()
    const bodies: CollectedBody2D[] = []

    collectNodeBodies2D(root, context, bodies)

    expect(bodies.map((body) => body.owner)).toEqual([first, hidden, nested])
    expect(bodies.map((body) => body.descriptor.identifier)).toEqual([
      first.identifier,
      hidden.identifier,
      nested.identifier,
    ])
    root.destroy()
  })

  it('skips destroyed subtrees', () => {
    const root = new Node()
    const removed = new Node()
    removed.add(createBody())
    const kept = createBody()
    root.add(removed)
    root.add(kept)
    root.load()
    removed.destroy()
    const bodies: CollectedBody2D[] = []

    collectNodeBodies2D(root, context, bodies)

    expect(bodies.map((body) => body.owner)).toEqual([kept])
    root.destroy()
  })

  it('ignores nodes that only draw', () => {
    const root = new Node()
    root.add(new Node())
    root.load()
    const bodies: CollectedBody2D[] = []

    collectNodeBodies2D(root, context, bodies)

    expect(bodies).toEqual([])
    root.destroy()
  })

  it('passes the step context to the nodes it visits', () => {
    const root = new Node()
    const body = new PhysicsBody2D({ position: new Vector2(7, 8) })
    root.add(body)
    root.load()
    const bodies: CollectedBody2D[] = []

    collectNodeBodies2D(root, { ...context, step: 4 }, bodies)

    expect(bodies[0]?.descriptor.position).toEqual(new Vector2(7, 8))
    root.destroy()
  })
})
