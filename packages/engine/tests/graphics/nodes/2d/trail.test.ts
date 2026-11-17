import { describe, expect, it } from 'vitest'

import {
  Color,
  type Draw2DCommand,
  RectNode,
  TrailNode,
  Vector2,
} from '../../../../source/index.js'

import { createContext, createMaterial } from './harness.js'

describe('TrailNode', () => {
  it('draws fading segments between points', () => {
    const material = createMaterial()
    const node = new TrailNode({ material, capacity: 4, width: 4, color: Color.red })
    node.addPoint(new Vector2(0, 0))
    node.addPoint(new Vector2(10, 0))
    node.addPoint(new Vector2(20, 0))

    const commands = node.draw(createContext()).commands as Draw2DCommand[]

    expect(commands).toHaveLength(2)
    expect(commands[0]?.tint?.a).toBeCloseTo(0.5)
    expect(commands[1]?.tint?.a).toBeCloseTo(1)
    node.destroy()
    material.destroy()
  })

  it('samples the followed node and keeps the capacity', () => {
    const material = createMaterial()
    const target = new RectNode({ position: new Vector2(0, 0) })
    const node = new TrailNode({ material, capacity: 2, follow: target, minimumDistance: 1 })

    target.position.value = new Vector2(10, 0)
    node.update({ deltaTime: 0.1 })
    target.position.value = new Vector2(20, 0)
    node.update({ deltaTime: 0.1 })
    target.position.value = new Vector2(30, 0)
    node.update({ deltaTime: 0.1 })

    expect(node.pointCount).toBe(2)
    node.destroy()
    target.destroy()
    material.destroy()
  })
})
