import { describe, expect, it } from 'vitest'

import { Color, type Draw2DCommand, SpriteNode, Vector2 } from '../../../../../source/index.js'
import { createContext, createMaterial } from '../harness.js'

describe('SpriteNode', () => {
  it('builds a centered quad that samples the requested region', () => {
    const material = createMaterial()
    const node = new SpriteNode({
      material,
      size: new Vector2(100, 50),
      region: { min: new Vector2(0.5, 0), max: new Vector2(1, 0.5) },
    })

    const command = node.draw(createContext()).commands[0] as Draw2DCommand
    const uvs = command.mesh.vertices.map((vertex) => vertex.textureCoordinate)

    expect(uvs).toEqual([
      new Vector2(0.5, 0),
      new Vector2(1, 0),
      new Vector2(1, 0.5),
      new Vector2(0.5, 0.5),
    ])
    expect(command.transform.m11).toBeCloseTo(100)
    node.destroy()
    material.destroy()
  })

  it('applies the color as a command tint', () => {
    const material = createMaterial()
    const color = new Color(1, 0.5, 0.25, 1)
    const node = new SpriteNode({ material, color })

    const command = node.draw(createContext()).commands[0] as Draw2DCommand

    expect(command.tint).toEqual(color)
    node.destroy()
    material.destroy()
  })

  it('rebuilds the geometry when the region changes', () => {
    const material = createMaterial()
    const node = new SpriteNode({ material })
    const first = node.draw(createContext()).commands[0] as Draw2DCommand
    node.region.value = { min: new Vector2(0, 0.5), max: new Vector2(0.5, 1) }
    const second = node.draw(createContext()).commands[0] as Draw2DCommand

    expect(second.mesh).not.toBe(first.mesh)
    expect(first.mesh.destroyed).toBe(true)
    node.destroy()
    material.destroy()
  })

  it('rejects regions outside the texture', () => {
    expect(
      () => new SpriteNode({ region: { min: new Vector2(0, 0), max: new Vector2(2, 1) } }),
    ).toThrow('between zero and one')
    expect(
      () => new SpriteNode({ region: { min: new Vector2(1, 0), max: new Vector2(0, 1) } }),
    ).toThrow('inverted')
  })
})
