import { describe, expect, it } from 'vitest'

import { type Draw2DCommand, TilemapNode, Vector2 } from '../../../source/index.js'

import { createContext, createMaterial } from './harness.js'

function createTileset(): { columns: number; rows: number; tileSize: Vector2 } {
  return { columns: 4, rows: 1, tileSize: new Vector2(16, 16) }
}

describe('TilemapNode', () => {
  it('draws each painted cell with its own region', () => {
    const material = createMaterial()
    const node = new TilemapNode({ material, tileset: createTileset(), columns: 4, rows: 3 })
    node.setTile(0, 0, 0)
    node.setTile(1, 1, 2)

    const commands = node.draw(createContext()).commands as Draw2DCommand[]

    expect(commands).toHaveLength(2)
    expect(node.tileCount).toBe(2)
    expect(commands[1]?.mesh.vertices[0]?.textureCoordinate).toEqual(new Vector2(0.5, 0))
    node.destroy()
    material.destroy()
  })

  it('clears cells and validates indices', () => {
    const material = createMaterial()
    const node = new TilemapNode({ material, tileset: createTileset(), columns: 2, rows: 2 })
    node.setTile(0, 0, 1)

    expect(node.clearTile(0, 0)).toBe(true)
    expect(node.clearTile(0, 0)).toBe(false)
    expect(() => {
      node.setTile(2, 0, 0)
    }).toThrow('inside the map')
    expect(() => {
      node.setTile(0, 0, 9)
    }).toThrow('tileset')
    node.destroy()
    material.destroy()
  })
})
