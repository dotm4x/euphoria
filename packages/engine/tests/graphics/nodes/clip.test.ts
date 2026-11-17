import { describe, expect, it } from 'vitest'

import {
  ClipNode,
  collectNodeCommands,
  type Draw2DCommand,
  RectNode,
  Vector2,
} from '../../../source/index.js'

import { createContext, createMaterial } from './harness.js'

describe('ClipNode', () => {
  it('clips the items drawn inside it', () => {
    const material = createMaterial()
    const clip = new ClipNode({ material, size: new Vector2(10, 10) })
    const child = new RectNode({ material, position: new Vector2(100, 100) })
    clip.add(child)
    clip.load()

    const commands: Draw2DCommand[] = []
    collectNodeCommands(clip, createContext(), commands)

    expect(commands[0]?.clip?.min).toEqual(new Vector2(-5, -5))
    expect(commands[0]?.clip?.max).toEqual(new Vector2(5, 5))
    clip.destroy()
    material.destroy()
  })

  it('intersects nested clips', () => {
    const material = createMaterial()
    const outer = new ClipNode({ material, size: new Vector2(10, 10) })
    const inner = new ClipNode({ material, size: new Vector2(4, 4), position: new Vector2(3, 0) })
    const child = new RectNode({ material })
    inner.add(child)
    outer.add(inner)
    outer.load()

    const commands: Draw2DCommand[] = []
    collectNodeCommands(outer, createContext(), commands)

    expect(commands[0]?.clip?.min).toEqual(new Vector2(1, -2))
    expect(commands[0]?.clip?.max).toEqual(new Vector2(5, 2))
    outer.destroy()
    material.destroy()
  })
})
