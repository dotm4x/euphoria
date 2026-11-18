import { describe, expect, it } from 'vitest'

import { createContext, createMaterial } from '../2d/harness.js'
import { type Draw3DCommand, TextNode3D } from '../../../../source/index.js'
import { createFont } from '../../text/fixtures.js'

describe('TextNode3D', () => {
  it('draws its text in the plane, facing positive Z', () => {
    const node = new TextNode3D({ font: createFont(), text: 'AB', material: createMaterial() })

    const command = node.draw(createContext()).commands[0] as Draw3DCommand

    expect(command.mesh.vertices).toHaveLength(8)
    expect(command.mesh.vertices[0]?.normal).toEqual({ x: 0, y: 0, z: 1 })
    node.destroy()
  })

  it('rebuilds its geometry when the text changes', () => {
    const node = new TextNode3D({ font: createFont(), text: 'A', material: createMaterial() })
    const first = (node.draw(createContext()).commands[0] as Draw3DCommand).mesh

    node.text.value = 'AB'
    const second = (node.draw(createContext()).commands[0] as Draw3DCommand).mesh

    expect(second).not.toBe(first)
    node.destroy()
  })

  it('centres the box when it is asked to', () => {
    const node = new TextNode3D({
      font: createFont(),
      text: 'AB',
      material: createMaterial(),
      centered: true,
    })

    const command = node.draw(createContext()).commands[0] as Draw3DCommand
    const xs = command.mesh.vertices.map((vertex) => vertex.position.x)

    expect(Math.min(...xs)).toBeCloseTo(-5.5)
    expect(Math.max(...xs)).toBeCloseTo(5.5)
    node.destroy()
  })

  it('places the glyphs at the requested depth', () => {
    const node = new TextNode3D({
      font: createFont(),
      text: 'A',
      material: createMaterial(),
      depth: 1.5,
    })

    const command = node.draw(createContext()).commands[0] as Draw3DCommand

    expect(command.mesh.vertices[0]?.position.z).toBe(1.5)
    node.destroy()
  })
})
