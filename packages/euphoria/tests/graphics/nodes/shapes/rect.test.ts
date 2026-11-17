import { describe, expect, it } from 'vitest'

import { type Draw2DCommand, RectNode, Vector2 } from '../../../../source/index.js'
import { createContext, createMaterial } from '../harness.js'

describe('RectNode', () => {
  it('scales a unit quad to the requested size', () => {
    const material = createMaterial()
    const node = new RectNode({ material, size: new Vector2(40, 20) })

    const command = node.draw(createContext()).commands[0] as Draw2DCommand
    const corner = command.transform.transform(new Vector2(0.5, 0.5))

    expect(corner.x).toBeCloseTo(20)
    expect(corner.y).toBeCloseTo(10)
    node.destroy()
    material.destroy()
  })
})
