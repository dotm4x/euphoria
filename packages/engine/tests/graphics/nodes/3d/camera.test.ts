import { describe, expect, it } from 'vitest'

import {
  Camera3D,
  Camera3DProjection,
  Vector2,
  Vector3,
  Vector4,
  Viewport,
} from '../../../../source/index.js'

function project(camera: Camera3D, point: Vector3, aspect: number = 1): Vector4 {
  const viewport = new Viewport(new Vector2(0, 0), new Vector2(aspect * 100, 100))
  const viewProjection = camera.view.multiply(camera.getProjection(viewport))

  return viewProjection.transform(new Vector4(point.x, point.y, point.z, 1))
}

describe('Camera3D', () => {
  it('looks towards negative z from its position', () => {
    const camera = new Camera3D({ position: new Vector3(0, 0, 10) })
    const ahead = project(camera, new Vector3(0, 0, 0))
    const behind = project(camera, new Vector3(0, 0, 20))

    expect(ahead.z / ahead.w).toBeLessThan(1)
    expect(ahead.w).toBeCloseTo(10)
    expect(behind.w).toBeLessThan(0)
    camera.destroy()
  })

  it('rotates the view with the node', () => {
    const camera = new Camera3D({ rotation: new Vector3(0, Math.PI / 2, 0) })
    const ahead = project(camera, new Vector3(-5, 0, 0))
    const side = project(camera, new Vector3(0, 0, -5))

    expect(ahead.w).toBeCloseTo(5)
    expect(side.w).toBeCloseTo(0)
    camera.destroy()
  })

  it('creates perspective projections that honour the aspect ratio', () => {
    const camera = new Camera3D()
    const wide = project(camera, new Vector3(1, 0, -1), 2)
    const square = project(camera, new Vector3(1, 0, -1), 1)

    expect(wide.x / wide.w).toBeCloseTo(0.866, 3)
    expect(square.x / square.w).toBeCloseTo(1.7321, 3)
    camera.destroy()
  })

  it('creates orthographic projections sized by the viewport', () => {
    const camera = new Camera3D({ projection: Camera3DProjection.orthographic, size: 10 })
    const top = project(camera, new Vector3(0, 5, -10), 1)
    const edge = project(camera, new Vector3(5, 0, -10), 1)

    expect(top.y / top.w).toBeCloseTo(1)
    expect(edge.x / edge.w).toBeCloseTo(1)
    camera.destroy()
  })

  it('validates its parameters', () => {
    expect(() => new Camera3D({ fieldOfView: 0 })).toThrow('field of view')
    expect(() => new Camera3D({ size: 0 })).toThrow('size')
    expect(() => new Camera3D({ near: 0 })).toThrow('near plane')
    expect(() => new Camera3D({ near: 10, far: 1 })).toThrow('near plane')
  })

  it('inverts the node transform without rolling when yawed and pitched', () => {
    const camera = new Camera3D({
      position: new Vector3(2, 3, 4),
      rotation: new Vector3(0.3, 0.9, 0),
    })
    const inverse = camera.view.invert()
    const origin = camera.globalPosition

    expect(inverse?.transform(new Vector4(0, 0, 0, 1)).x).toBeCloseTo(origin.x)
    expect(inverse?.transform(new Vector4(0, 0, 0, 1)).y).toBeCloseTo(origin.y)
    expect(inverse?.transform(new Vector4(0, 0, 0, 1)).z).toBeCloseTo(origin.z)
    const forward = camera.globalBasis.forward
    const world = inverse?.transform(new Vector4(0, 0, -1, 0))
    expect(world?.x).toBeCloseTo(forward.x)
    expect(world?.y).toBeCloseTo(forward.y)
    expect(world?.z).toBeCloseTo(forward.z)
    camera.destroy()
  })
})
