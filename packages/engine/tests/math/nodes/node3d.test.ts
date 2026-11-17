import { describe, expect, it } from 'vitest'

import { Node, Node3D, Vector3, Vector4 } from '../../../source/index.js'

function worldPoint(node: Node3D, point: Vector3): Vector4 {
  return node.globalTransform.transform(new Vector4(point.x, point.y, point.z, 1))
}

describe('Node3D', () => {
  it('applies position, rotation and scale to the local transform', () => {
    const node = new Node3D({ position: new Vector3(1, 2, 3), scale: new Vector3(2, 2, 2) })
    const result = worldPoint(node, new Vector3(0, 0, 0))

    expect(result.x).toBeCloseTo(1)
    expect(result.y).toBeCloseTo(2)
    expect(result.z).toBeCloseTo(3)
    expect(worldPoint(node, new Vector3(1, 0, 0)).x).toBeCloseTo(3)
    node.destroy()
  })

  it('rotates around Y by default', () => {
    const node = new Node3D({ rotation: new Vector3(0, Math.PI / 2, 0) })
    const result = worldPoint(node, new Vector3(1, 0, 0))

    expect(result.x).toBeCloseTo(0)
    expect(result.z).toBeCloseTo(-1)
    node.destroy()
  })

  it('composes ancestor transforms and skips plain nodes', () => {
    const root = new Node3D({ position: new Vector3(0, 10, 0) })
    const group = new Node({ name: 'group' })
    const child = new Node3D({ position: new Vector3(0, 1, 0) })
    root.add(group)
    group.add(child)

    const result = worldPoint(child, new Vector3(0, 0, 0))

    expect(result.y).toBeCloseTo(11)
    expect(child.globalPosition).toEqual(new Vector3(0, 11, 0))
    root.destroy()
  })

  it('moves the node in world space through its global position', () => {
    const node = new Node3D({ position: new Vector3(5, 5, 5) })

    node.globalPosition = new Vector3(1, 2, 3)

    expect(node.position.value).toEqual(new Vector3(1, 2, 3))
    expect(node.globalPosition).toEqual(new Vector3(1, 2, 3))
    node.destroy()
  })

  it('exposes the world basis', () => {
    const node = new Node3D({ rotation: new Vector3(0, Math.PI / 2, 0) })
    const basis = node.globalBasis

    expect(basis.forward.z).toBeCloseTo(0)
    expect(basis.forward.x).toBeCloseTo(-1)
    expect(basis.up.y).toBeCloseTo(1)
    node.destroy()
  })

  it('uses the origin as the pivot', () => {
    const node = new Node3D({
      origin: new Vector3(0, 1, 0),
      rotation: new Vector3(0, Math.PI, 0),
    })
    const result = worldPoint(node, new Vector3(0, 1, 0))

    expect(result.x).toBeCloseTo(0)
    expect(result.y).toBeCloseTo(0)
    expect(result.z).toBeCloseTo(0)
    node.destroy()
  })

  it('applies pitch before yaw so the horizon stays level', () => {
    const node = new Node3D({ rotation: new Vector3(0.35, 1.1, 0) })
    const basis = node.globalBasis

    expect(basis.right.y).toBeCloseTo(0)
    expect(basis.up.y).toBeGreaterThan(0)
    expect(basis.forward.y).toBeCloseTo(Math.sin(0.35))
    node.destroy()
  })

  it('applies roll around the local forward axis', () => {
    const node = new Node3D({ rotation: new Vector3(0, 0, Math.PI / 2) })
    const basis = node.globalBasis

    expect(basis.up.x).toBeCloseTo(-1)
    node.destroy()
  })
})
