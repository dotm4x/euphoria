import { describe, expect, it } from 'vitest'

import {
  ColliderDescriptor2D,
  ColliderOutline2D,
  createBoxShape2D,
  createCircleShape2D,
  Draw2DCommand,
  GroupNode,
  Vector2,
} from '../../../../source/index.js'
import { createContext, createMaterial } from '../../../graphics/nodes/2d/harness.js'

describe('ColliderOutline2D', () => {
  it('draws one command with the geometry of every collider', () => {
    const material = createMaterial()
    const root = new GroupNode({ material })
    const outline = new ColliderOutline2D({
      material,
      colliders: [
        new ColliderDescriptor2D({ shape: createBoxShape2D(new Vector2(1, 1)) }),
        new ColliderDescriptor2D({ shape: createCircleShape2D(1), offset: new Vector2(2, 0) }),
      ],
    })
    root.add(outline)
    root.load()

    const commands = outline.draw(createContext()).commands

    expect(commands).toHaveLength(1)
    const [command] = commands
    expect(command).toBeInstanceOf(Draw2DCommand)
    if (!(command instanceof Draw2DCommand)) throw new Error('Expected a drawing command.')
    expect(command.mesh.vertices.length).toBe(4 * 4 + 24 * 4)
    root.destroy()
    material.destroy()
  })

  it('rebuilds its geometry only when the colliders change', () => {
    const material = createMaterial()
    const colliders = [new ColliderDescriptor2D({ shape: createCircleShape2D(1) })]
    const outline = new ColliderOutline2D({ material, colliders, quality: 8 })
    outline.load()

    const meshOf = (): unknown => {
      const [command] = outline.draw(createContext()).commands

      return command instanceof Draw2DCommand ? command.mesh : undefined
    }

    const first = meshOf()
    expect(meshOf()).toBe(first)
    outline.setColliders([new ColliderDescriptor2D({ shape: createBoxShape2D(new Vector2(1, 1)) })])
    expect(meshOf()).not.toBe(first)
    outline.destroy()
    material.destroy()
  })
})
