import { describe, expect, it } from 'vitest'

import {
  createBoxMesh,
  createPlaneMesh,
  createSphereMesh,
  GraphicMesh3D,
  Vector2,
  Vector3,
  Vertex3D,
} from '../../../source/index.js'

describe('GraphicMesh3D', () => {
  it('computes bounds and validates vertices', () => {
    const mesh = new GraphicMesh3D([
      new Vertex3D(new Vector3(0, 0, 0), new Vector3(0, 1, 0), new Vector2(0, 0)),
      new Vertex3D(new Vector3(2, 0, 0), new Vector3(0, 1, 0), new Vector2(1, 0)),
      new Vertex3D(new Vector3(0, 3, 4), new Vector3(0, 1, 0), new Vector2(0, 1)),
    ])

    expect(mesh.bounds.min).toEqual(new Vector3(0, 0, 0))
    expect(mesh.bounds.max).toEqual(new Vector3(2, 3, 4))
    expect(
      () =>
        new GraphicMesh3D([
          new Vertex3D(new Vector3(Number.NaN, 0, 0), new Vector3(0, 1, 0), new Vector2(0, 0)),
          new Vertex3D(new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector2(0, 0)),
          new Vertex3D(new Vector3(0, 1, 0), new Vector3(0, 1, 0), new Vector2(0, 0)),
        ]),
    ).toThrow('nonfinite')
    mesh.destroy()
  })

  it('creates a box with one normal per face', () => {
    const box = createBoxMesh(new Vector3(2, 4, 6))

    expect(box.vertices).toHaveLength(24)
    expect(box.indices).toHaveLength(36)
    expect(box.bounds.min).toEqual(new Vector3(-1, -2, -3))
    expect(box.bounds.max).toEqual(new Vector3(1, 2, 3))
    expect(box.vertices.filter((vertex) => vertex.normal.z === 1)).toHaveLength(4)
    box.destroy()
  })

  it('creates a horizontal plane facing up', () => {
    const plane = createPlaneMesh(new Vector2(4, 2))

    expect(plane.vertices).toHaveLength(4)
    expect(plane.indices).toHaveLength(6)
    expect(plane.vertices.every((vertex) => vertex.normal.y === 1)).toBe(true)
    expect(plane.bounds.max).toEqual(new Vector3(2, 0, 1))
    plane.destroy()
  })

  it('creates a sphere with the requested divisions', () => {
    const sphere = createSphereMesh(2, 4, 8)

    expect(sphere.vertices).toHaveLength(5 * 9)
    expect(sphere.indices).toHaveLength(4 * 8 * 6)
    expect(sphere.bounds.max.y).toBeCloseTo(2)
    expect(sphere.vertices.every((vertex) => vertex.normal.magnitude)).toBe(true)
    sphere.destroy()
  })

  it('validates primitive parameters', () => {
    expect(() => createBoxMesh(new Vector3(0, 1, 1))).toThrow('greater than zero')
    expect(() => createPlaneMesh(new Vector2(1, 0))).toThrow('greater than zero')
    expect(() => createSphereMesh(0)).toThrow('greater than zero')
    expect(() => createSphereMesh(1, 1, 8)).toThrow('two rings')
  })
})
