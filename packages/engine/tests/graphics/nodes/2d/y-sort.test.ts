import { describe, expect, it } from 'vitest'

import {
  collectNodeCommands,
  Color,
  type Draw2DCommand,
  RectNode,
  Vector2,
  YSortNode,
} from '../../../../source/index.js'

import { createContext, createMaterial } from './harness.js'

describe('YSortNode', () => {
  it('draws children from the lowest to the highest position', () => {
    const material = createMaterial()
    const group = new YSortNode({ material })
    const front = new RectNode({ position: new Vector2(0, 20), selfModulate: Color.red })
    const back = new RectNode({ position: new Vector2(0, -20), selfModulate: Color.blue })
    group.add(front)
    group.add(back)
    group.load()

    const commands: Draw2DCommand[] = []
    collectNodeCommands(group, createContext(), commands)

    expect(commands).toHaveLength(2)
    expect(commands[0]?.tint).toEqual(Color.blue)
    expect(commands[1]?.tint).toEqual(Color.red)
    group.destroy()
    material.destroy()
  })
})
