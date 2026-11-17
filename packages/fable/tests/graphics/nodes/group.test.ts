import { describe, expect, it } from 'vitest'

import { Color, type Draw2DCommand, GroupNode, RectNode } from '../../../source/index.js'

import { createContext, createMaterial } from './harness.js'

describe('GroupNode', () => {
  it('draws nothing and tints its children', () => {
    const material = createMaterial()
    const group = new GroupNode({ material, modulate: new Color(1, 0, 0, 1) })
    group.add(new RectNode())

    expect(group.draw(createContext()).commands).toHaveLength(0)
    const child = group.children.values().next().value as RectNode
    const command = child.draw(createContext()).commands[0] as Draw2DCommand
    expect(command.tint?.g).toBe(0)
    group.destroy()
    material.destroy()
  })
})
