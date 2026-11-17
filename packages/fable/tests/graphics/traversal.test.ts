import { describe, expect, it } from 'vitest'

import {
  collectNodeCommands,
  type DrawCommand,
  GroupNode,
  RectNode,
  Vector2,
} from '../../source/index.js'

import { createContext, createMaterial } from './nodes/harness.js'

describe('collectNodeCommands', () => {
  it('skips invisible and destroyed subtrees', () => {
    const material = createMaterial()
    const root = new GroupNode({ material })
    const visible = new RectNode({ material })
    const hidden = new RectNode({ material })
    hidden.visible.value = false
    const nested = new RectNode({ material })
    hidden.add(nested)
    root.add(visible)
    root.add(hidden)
    root.load()
    const commands: DrawCommand[] = []

    collectNodeCommands(root, createContext(), commands)

    expect(commands).toHaveLength(1)
    root.destroy()
    material.destroy()
  })

  it('does not visit the children of a render container', () => {
    const material = createMaterial()
    const root = new GroupNode({ material })
    const container = new GroupNode({ material })
    container.add(new RectNode({ material }))
    root.add(container)
    root.load()
    ;(container as unknown as { collectChildren: () => [] }).collectChildren = () => []
    const commands: DrawCommand[] = []

    collectNodeCommands(root, createContext(), commands)

    expect(commands).toHaveLength(0)
    root.destroy()
    material.destroy()
  })

  it('keeps each node in world space', () => {
    const material = createMaterial()
    const root = new GroupNode({ material, position: new Vector2(10, 0) })
    root.add(new RectNode({ material, position: new Vector2(5, 0) }))
    root.load()
    const commands: DrawCommand[] = []

    collectNodeCommands(root, createContext(), commands)

    expect(commands).toHaveLength(1)
    root.destroy()
    material.destroy()
  })
})
