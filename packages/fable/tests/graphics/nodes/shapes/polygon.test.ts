import { describe, expect, it } from 'vitest'

import { type Draw2DCommand, PolygonNode, Vector2 } from '../../../../source/index.js'
import { createContext, createMaterial } from '../harness.js'

describe('PolygonNode', () => {
  it('triangulates the polygon as a fan', () => {
    const material = createMaterial()
    const node = new PolygonNode({
      material,
      polygon: [new Vector2(-1, -1), new Vector2(1, -1), new Vector2(1, 1), new Vector2(-1, 1)],
    })

    const command = node.draw(createContext()).commands[0] as Draw2DCommand

    expect(command.mesh.indices).toHaveLength(6)
    expect(command.mesh.vertices).toHaveLength(4)
    node.destroy()
    material.destroy()
  })

  it('requires at least three vertices', () => {
    expect(() => new PolygonNode({ polygon: [new Vector2(0, 0), new Vector2(1, 0)] })).toThrow(
      'three vertices',
    )
  })
})
