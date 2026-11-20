import { describe, expect, it } from 'vitest'

import { createTextMesh2D, layoutText } from '../../../source/index.js'

import { createFont } from './fixtures.js'

const layout = layoutText(createFont(), 'AB')

describe('createTextMesh2D', () => {
  it('creates one quad per glyph with its atlas coordinates', () => {
    const mesh = createTextMesh2D(layout)

    expect(mesh.vertices).toHaveLength(8)
    expect(mesh.indices).toHaveLength(12)
    expect(mesh.vertices[0]?.position).toEqual({ x: 0, y: 0 })
    expect(mesh.vertices[2]?.position).toEqual({ x: 6, y: 8 })
    expect(mesh.vertices[0]?.textureCoordinate).toEqual({ x: 0, y: 0 })
    expect(mesh.vertices[2]?.textureCoordinate).toEqual({ x: 0.5, y: 0.5 })
  })

  it('reports the bounds of the whole text', () => {
    const mesh = createTextMesh2D(layout)

    expect(mesh.bounds.min).toEqual({ x: 0, y: 0 })
    expect(mesh.bounds.max).toEqual({ x: 11, y: 8 })
  })

  it('refuses to build a mesh for a text without visible glyphs', () => {
    expect(() => createTextMesh2D(layoutText(createFont(), ''))).toThrow(/complete triangle/)
  })
})
