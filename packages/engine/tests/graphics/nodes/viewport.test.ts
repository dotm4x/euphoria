import { describe, expect, it } from 'vitest'

import {
  ClearCommand,
  collectNodeCommands,
  type Draw2DCommand,
  RectNode,
  RenderTarget,
  Vector2,
  ViewportNode,
} from '../../../source/index.js'

import { createContext, createMaterial, RecordingSink } from './harness.js'

describe('ViewportNode', () => {
  it('renders its children into a target and draws the result', () => {
    const material = createMaterial()
    const sink = new RecordingSink()
    const node = new ViewportNode({
      material,
      size: new Vector2(64, 32),
      createMaterial: () => createMaterial(),
    })
    node.add(new RectNode({ material }))
    node.load()

    const commands: Draw2DCommand[] = []
    collectNodeCommands(node, createContext(sink), commands)

    expect(node.target).toBeInstanceOf(RenderTarget)
    expect(sink.renders).toHaveLength(2)
    expect(sink.renders[0]?.commands[0]).toBeInstanceOf(ClearCommand)
    expect(sink.renders[1]?.target).toBe(node.target)
    expect(commands).toHaveLength(1)
    expect(commands[0]?.transform.m11).toBeCloseTo(64)
    node.destroy()
    material.destroy()
  })

  it('requires a drawing sink', () => {
    const material = createMaterial()
    const node = new ViewportNode({
      material,
      size: new Vector2(8, 8),
      createMaterial: () => createMaterial(),
    })

    expect(() => node.draw(createContext())).toThrow('requires a drawing sink')
    node.destroy()
    material.destroy()
  })
})
