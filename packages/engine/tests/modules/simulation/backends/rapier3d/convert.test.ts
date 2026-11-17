import { describe, expect, it } from 'vitest'

import { Matrix4x4, Vector3 } from '../../../../../source/index.js'
import {
  eulerToRotation,
  rotationToEuler,
} from '../../../../../source/modules/simulation/backends/rapier3d/convert.js'

/** Rotation matrix of a quaternion, in the usual column-vector convention. */
function matrixOf({ x, y, z, w }: { x: number; y: number; z: number; w: number }): number[][] {
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ]
}

describe('eulerToRotation', () => {
  it('matches the rotation order of three-dimensional nodes', () => {
    const rotations = [
      [0, 0, 0],
      [0.3, 0.7, -0.2],
      [-1.1, 0.4, 0.9],
      [0.8, -2.4, 0.15],
    ]

    for (const [pitch, yaw, roll] of rotations) {
      const quaternion = eulerToRotation(new Vector3(pitch ?? 0, yaw ?? 0, roll ?? 0))
      const matrix = matrixOf(quaternion)
      const engine = Matrix4x4.rotationZ(roll ?? 0)
        .multiply(Matrix4x4.rotationX(pitch ?? 0))
        .multiply(Matrix4x4.rotationY(yaw ?? 0))

      // Nodes use row vectors, so the equivalent column rotation is the transpose.
      expect(engine.m11).toBeCloseTo(matrix[0]?.[0] ?? 0, 6)
      expect(engine.m12).toBeCloseTo(matrix[1]?.[0] ?? 0, 6)
      expect(engine.m13).toBeCloseTo(matrix[2]?.[0] ?? 0, 6)
      expect(engine.m21).toBeCloseTo(matrix[0]?.[1] ?? 0, 6)
      expect(engine.m22).toBeCloseTo(matrix[1]?.[1] ?? 0, 6)
      expect(engine.m23).toBeCloseTo(matrix[2]?.[1] ?? 0, 6)
      expect(engine.m31).toBeCloseTo(matrix[0]?.[2] ?? 0, 6)
      expect(engine.m32).toBeCloseTo(matrix[1]?.[2] ?? 0, 6)
      expect(engine.m33).toBeCloseTo(matrix[2]?.[2] ?? 0, 6)
    }
  })

  it('round trips angles below a quarter turn of pitch', () => {
    const rotations = [new Vector3(0.2, 1.1, -0.4), new Vector3(-0.7, 0.3, 2.2)]

    for (const rotation of rotations) {
      const euler = rotationToEuler(eulerToRotation(rotation))
      expect(euler.x).toBeCloseTo(rotation.x, 5)
      expect(euler.y).toBeCloseTo(rotation.y, 5)
      expect(euler.z).toBeCloseTo(rotation.z, 5)
    }
  })

  it('folds roll into yaw at a quarter turn of pitch and keeps the orientation', () => {
    const rotation = new Vector3(Math.PI / 2, 0.5, 0.25)
    const euler = rotationToEuler(eulerToRotation(rotation))
    const original = matrixOf(eulerToRotation(rotation))
    const folded = matrixOf(eulerToRotation(euler))

    expect(euler.x).toBeCloseTo(Math.PI / 2, 5)
    expect(euler.y).toBeCloseTo(0.25, 5)
    expect(euler.z).toBeCloseTo(0, 5)
    for (const row of [0, 1, 2]) {
      for (const column of [0, 1, 2]) {
        expect(folded[row]?.[column]).toBeCloseTo(original[row]?.[column] ?? 0, 5)
      }
    }
  })
})
