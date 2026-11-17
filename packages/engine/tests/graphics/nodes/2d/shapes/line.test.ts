import { describe, expect, it } from 'vitest'

import { LineNode, Vector2 } from '../../../../../source/index.js'
import { createContext, createMaterial } from '../harness.js'

describe('LineNode', () => {
  it('draws one quad per segment plus joined points', () => {
    const material = createMaterial()
    const node = new LineNode({
      material,
      points: [new Vector2(0, 0), new Vector2(10, 0), new Vector2(10, 10)],
      width: 2,
    })

    expect(node.draw(createContext()).commands).toHaveLength(3)
    node.destroy()
    material.destroy()
  })

  it('closes the line and skips degenerate segments', () => {
    const material = createMaterial()
    const node = new LineNode({
      material,
      points: [new Vector2(0, 0), new Vector2(10, 0), new Vector2(10, 0), new Vector2(0, 10)],
      closed: true,
      joined: false,
    })

    expect(node.draw(createContext()).commands).toHaveLength(3)
    node.destroy()
    material.destroy()
  })

  it('requires at least two points', () => {
    expect(() => new LineNode({ points: [new Vector2(0, 0)] })).toThrow('two points')
  })

  it('draws the closing join when the line is closed', () => {
    const material = createMaterial()
    const node = new LineNode({
      material,
      points: [new Vector2(0, 0), new Vector2(10, 0), new Vector2(10, 10)],
      closed: true,
    })

    expect(node.draw(createContext()).commands).toHaveLength(6)
    node.destroy()
    material.destroy()
  })
})
