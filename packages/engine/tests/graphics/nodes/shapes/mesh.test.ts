import { describe, expect, it } from 'vitest'

import {
  Color,
  type Draw2DCommand,
  GraphicMesh2D,
  GraphicVertex2D,
  MeshNode,
  Vector2,
} from '../../../../source/index.js'
import { createContext, createMaterial } from '../harness.js'

describe('MeshNode', () => {
  it('draws the provided mesh', () => {
    const material = createMaterial()
    const mesh = new GraphicMesh2D([
      new GraphicVertex2D(new Vector2(0, 0), new Vector2(0, 0), Color.white),
      new GraphicVertex2D(new Vector2(1, 0), new Vector2(1, 0), Color.white),
      new GraphicVertex2D(new Vector2(0, 1), new Vector2(0, 1), Color.white),
    ])
    const node = new MeshNode({ material, mesh })

    const command = node.draw(createContext()).commands[0] as Draw2DCommand

    expect(command.mesh).toBe(mesh)
    node.destroy()
    mesh.destroy()
    material.destroy()
  })

  it('stops drawing once its mesh is destroyed', () => {
    const material = createMaterial()
    const mesh = new GraphicMesh2D([
      new GraphicVertex2D(new Vector2(0, 0), new Vector2(0, 0), Color.white),
      new GraphicVertex2D(new Vector2(1, 0), new Vector2(1, 0), Color.white),
      new GraphicVertex2D(new Vector2(0, 1), new Vector2(0, 1), Color.white),
    ])
    const node = new MeshNode({ material, mesh })
    mesh.destroy()

    expect(node.draw(createContext()).commands).toHaveLength(0)
    node.destroy()
    material.destroy()
  })
})
