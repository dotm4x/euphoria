import { describe, expect, it } from 'vitest'

import { type Draw2DCommand, NinePatchNode, Vector2 } from '../../../../source/index.js'
import { createContext, createMaterial } from '../harness.js'

describe('NinePatchNode', () => {
  it('draws nine patches and keeps the corners unscaled', () => {
    const material = createMaterial()
    const node = new NinePatchNode({
      material,
      size: new Vector2(90, 90),
      insets: { left: 0.1, right: 0.1, top: 0.1, bottom: 0.1 },
    })
    const commands = node.draw(createContext()).commands as Draw2DCommand[]

    expect(commands).toHaveLength(9)
    expect(commands[0]?.transform.m11).toBeCloseTo(9)
    expect(commands[4]?.transform.m11).toBeCloseTo(72)
    node.destroy()
    material.destroy()
  })

  it('rejects insets that do not fit', () => {
    expect(
      () =>
        new NinePatchNode({
          size: new Vector2(1, 1),
          insets: { left: 0.6, right: 0.6, top: 0, bottom: 0 },
        }),
    ).toThrow('fit inside the region')
  })
})
