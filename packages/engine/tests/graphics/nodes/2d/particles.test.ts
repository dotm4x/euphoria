import { describe, expect, it } from 'vitest'

import { ParticlesNode } from '../../../../source/index.js'

import { createContext, createMaterial } from './harness.js'

describe('ParticlesNode', () => {
  it('emits, integrates and expires particles', () => {
    const material = createMaterial()
    const node = new ParticlesNode({
      material,
      count: 8,
      emissionRate: 0,
      lifetime: { x: 0.2, y: 0.2 } as never,
      random: () => 0.5,
    })
    node.burst(4)

    expect(node.particleCount).toBe(4)
    expect(node.draw(createContext()).commands).toHaveLength(4)

    node.update({ deltaTime: 0.3 })
    expect(node.particleCount).toBe(0)
    node.destroy()
    material.destroy()
  })

  it('respects the particle budget', () => {
    const material = createMaterial()
    const node = new ParticlesNode({ material, count: 2, emissionRate: 0 })

    node.burst(10)

    expect(node.particleCount).toBe(2)
    node.destroy()
    material.destroy()
  })
})
