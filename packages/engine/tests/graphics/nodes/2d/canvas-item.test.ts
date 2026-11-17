import { describe, expect, it } from 'vitest'

import {
  Color,
  type Draw2DCommand,
  GroupNode,
  RectNode,
  Vector2,
} from '../../../../source/index.js'

import { createContext, createMaterial } from './harness.js'

describe('CanvasItem2D', () => {
  it('draws its shape with the inherited order, depth and material', () => {
    const material = createMaterial()
    const item = new RectNode({ material, size: new Vector2(10, 20), order: 3, depth: 2 })

    const commands = item.draw(createContext()).commands

    expect(commands).toHaveLength(1)
    const command = commands[0] as Draw2DCommand
    expect(command.material).toBe(material)
    expect(command.order).toBe(3)
    expect(command.depth).toBe(2)
    expect(command.tint).toBeUndefined()
    item.destroy()
    material.destroy()
  })

  it('inherits material and modulate from canvas ancestors', () => {
    const material = createMaterial()
    const group = new GroupNode({ material, modulate: new Color(0.5, 0.5, 0.5, 1) })
    const item = new RectNode({ modulate: new Color(1, 0.5, 1, 1) })
    group.add(item)

    const command = item.draw(createContext()).commands[0] as Draw2DCommand

    expect(command.material).toBe(material)
    expect(command.tint?.r).toBeCloseTo(0.5)
    expect(command.tint?.g).toBeCloseTo(0.25)
    group.destroy()
  })

  it('fails without a material', () => {
    const item = new RectNode()

    expect(() => item.draw(createContext())).toThrow('requires a material')
    item.destroy()
  })

  it('mirrors the shape when flipped', () => {
    const material = createMaterial()
    const item = new RectNode({ material, flippedHorizontally: true })

    const command = item.draw(createContext()).commands[0] as Draw2DCommand

    expect(command.transform.m11).toBe(-1)
    item.destroy()
    material.destroy()
  })

  it('places the local shape in world space', () => {
    const material = createMaterial()
    const parent = new GroupNode({ material, position: new Vector2(10, 5) })
    const item = new RectNode({ position: new Vector2(2, 3) })
    parent.add(item)

    const command = item.draw(createContext()).commands[0] as Draw2DCommand
    const center = command.transform.transform(new Vector2(0, 0))

    expect(center.x).toBeCloseTo(12)
    expect(center.y).toBeCloseTo(8)
    parent.destroy()
  })
})
