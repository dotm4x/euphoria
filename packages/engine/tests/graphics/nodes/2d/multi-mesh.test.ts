import { describe, expect, it } from 'vitest'

import {
  Color,
  GraphicMesh2D,
  GraphicVertex2D,
  Matrix3x2,
  MultiMeshNode,
  Vector2,
} from '../../../../source/index.js'

import { createContext, createMaterial } from './harness.js'

function createMesh(): GraphicMesh2D {
  return new GraphicMesh2D([
    new GraphicVertex2D(new Vector2(0, 0), new Vector2(0, 0), Color.white),
    new GraphicVertex2D(new Vector2(1, 0), new Vector2(1, 0), Color.white),
    new GraphicVertex2D(new Vector2(0, 1), new Vector2(0, 1), Color.white),
  ])
}

describe('MultiMeshNode', () => {
  it('draws one command per instance', () => {
    const material = createMaterial()
    const mesh = createMesh()
    const node = new MultiMeshNode({ material, mesh, count: 3 })

    expect(node.draw(createContext()).commands).toHaveLength(3)
    node.setTransform(0, Matrix3x2.translation(5, 0))
    node.setColor(1, Color.red)
    const commands = node.draw(createContext()).commands

    expect(commands).toHaveLength(3)
    expect(() => {
      node.setTransform(3, Matrix3x2.identity)
    }).toThrow('outside the multi-mesh range')
    node.destroy()
    mesh.destroy()
    material.destroy()
  })

  it('draws only the active instances', () => {
    const material = createMaterial()
    const mesh = createMesh()
    const node = new MultiMeshNode({ material, mesh, count: 4 })

    node.setActiveCount(2)

    expect(node.activeCount).toBe(2)
    expect(node.draw(createContext()).commands).toHaveLength(2)
    expect(() => {
      node.setActiveCount(5)
    }).toThrow('outside the multi-mesh range')
    node.destroy()
    mesh.destroy()
    material.destroy()
  })
})
