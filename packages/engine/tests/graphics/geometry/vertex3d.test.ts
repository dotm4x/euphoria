import { describe, expect, it } from 'vitest'

import { Vector2, Vector3, Vertex3D } from '../../../source/index.js'

describe('Vertex3D', () => {
  it('stores and normalizes its attributes', () => {
    const vertex = new Vertex3D(new Vector3(1, 2, 3), new Vector3(0, 2, 0), new Vector2(0.5, 0.25))

    expect(vertex.position).toEqual(new Vector3(1, 2, 3))
    expect(vertex.normal).toEqual(new Vector3(0, 1, 0))
    expect(vertex.textureCoordinate).toEqual(new Vector2(0.5, 0.25))
  })

  it('rejects zero normals', () => {
    expect(
      () => new Vertex3D(new Vector3(0, 0, 0), new Vector3(0, 0, 0), new Vector2(0, 0)),
    ).toThrow('must not be zero')
  })

  it('compares by value', () => {
    const vertex = new Vertex3D(new Vector3(1, 1, 1), new Vector3(0, 1, 0), new Vector2(0, 0))

    expect(vertex.equals(vertex)).toBe(true)
    expect(
      vertex.equals(new Vertex3D(new Vector3(0, 0, 0), new Vector3(0, 1, 0), new Vector2(0, 0))),
    ).toBe(false)
  })
})
