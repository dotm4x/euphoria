import { describe, expect, it } from 'vitest'

import {
  Camera2D,
  collectNodeCommands,
  ParallaxNode,
  RectNode,
  Vector2,
} from '../../../source/index.js'

import { createContext, createMaterial } from './harness.js'

describe('ParallaxNode', () => {
  it('scrolls children at the requested factor', () => {
    const material = createMaterial()
    const camera = new Camera2D({ position: new Vector2(100, 0) })
    const parallax = new ParallaxNode({ material, factor: new Vector2(0.5, 0.5) })
    const child = new RectNode({ material })
    parallax.add(child)
    parallax.load()

    const context = { ...createContext(), camera }
    collectNodeCommands(parallax, context, [])

    expect(parallax.position.value.x).toBeCloseTo(50)
    parallax.destroy()
    material.destroy()
  })
})
