import { describe, expect, it } from 'vitest'

import {
  Color,
  type Draw2DCommand,
  TextAlignment,
  TextNode,
  Vector2,
} from '../../../../source/index.js'
import { createFont } from '../../text/fixtures.js'

import { createContext, createMaterial } from './harness.js'

describe('TextNode', () => {
  it('draws one quad per glyph of its text', () => {
    const material = createMaterial()
    const node = new TextNode({ material, font: createFont(), text: 'AB' })

    const command = node.draw(createContext()).commands[0] as Draw2DCommand

    expect(command.mesh.vertices).toHaveLength(8)
    expect(command.mesh.indices).toHaveLength(12)
    node.destroy()
    material.destroy()
  })

  it('lays its text out with the requested size and alignment', () => {
    const node = new TextNode({
      font: createFont(),
      text: 'AB',
      material: createMaterial(),
      pixelSize: 20,
      align: TextAlignment.center,
      wrapWidth: 40,
    })

    expect(node.width).toBe(40)
    expect(node.height).toBe(24)
    expect(node.layout.quads[0]?.x).toBeCloseTo(9)
    node.destroy()
  })

  it('rebuilds its geometry when the text changes and reuses it otherwise', () => {
    const node = new TextNode({ font: createFont(), text: 'A', material: createMaterial() })
    const first = (node.draw(createContext()).commands[0] as Draw2DCommand).mesh
    const again = (node.draw(createContext()).commands[0] as Draw2DCommand).mesh

    node.text.value = 'AB'
    const second = (node.draw(createContext()).commands[0] as Draw2DCommand).mesh

    expect(again).toBe(first)
    expect(second).not.toBe(first)
    node.destroy()
  })

  it('starts at the origin and can be centred on it', () => {
    const origin = new TextNode({ font: createFont(), text: 'AB', material: createMaterial() })
    const centered = new TextNode({
      font: createFont(),
      text: 'AB',
      material: createMaterial(),
      centered: true,
    })

    const originCommand = origin.draw(createContext()).commands[0] as Draw2DCommand
    const centeredCommand = centered.draw(createContext()).commands[0] as Draw2DCommand

    expect(originCommand.transform.m31).toBeCloseTo(0)
    expect(centeredCommand.transform.m31).toBeCloseTo(-5.5)
    expect(centeredCommand.transform.m32).toBeCloseTo(-6)
    origin.destroy()
    centered.destroy()
  })

  it('applies its color as a command tint', () => {
    const color = new Color(1, 0.5, 0.25, 1)
    const node = new TextNode({
      font: createFont(),
      text: 'A',
      material: createMaterial(),
      modulate: color,
    })

    const command = node.draw(createContext()).commands[0] as Draw2DCommand

    expect(command.tint).toEqual(color)
    node.destroy()
  })

  it('positions the box where the node is', () => {
    const node = new TextNode({
      font: createFont(),
      text: 'A',
      material: createMaterial(),
      position: new Vector2(3, 4),
    })

    expect(node.position.value).toEqual(new Vector2(3, 4))
    expect(node.align.value).toBe(TextAlignment.left)
    node.destroy()
  })

  it('destroys the stores and the geometry it created', () => {
    const node = new TextNode({ font: createFont(), text: 'A', material: createMaterial() })
    const { text, font, pixelSize, align, wrapWidth, lineSpacing } = node
    node.draw(createContext())

    node.destroy()

    for (const store of [text, font, pixelSize, align, wrapWidth, lineSpacing]) {
      expect(store.destroyed).toBe(true)
    }
  })
})
