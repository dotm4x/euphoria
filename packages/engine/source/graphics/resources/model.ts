import { Resource } from '#/core/primitives/resource.js'
import { Bounds3 } from '#/math/geometry/bounds3.js'
import { Matrix4x4 } from '#/math/primitives/matrices/matrix4x4.js'
import { Vector3 } from '#/math/primitives/vectors/vector3.js'

import { type GraphicMesh3D } from '../geometry/mesh3d.js'
import { type ModelNode, type ModelRotation } from '../importers/gltf/parse.js'

import { type PbrMaterial } from './pbr.js'

/** Configuration for a model. */
export interface ModelOptions {
  /** Name of the model, normally the scene it was read from. */
  readonly name: string
  /** Roots of the model, in the order the file declares them. */
  readonly roots: readonly ModelNode[]
  /** Materials the parts of the model refer to, in file order. */
  readonly materials?: readonly PbrMaterial[]
  /** Source the model was read from. */
  readonly source?: string
}

/**
 * Geometry and hierarchy read from a model file.
 *
 * A model is a resource, not a scene: it holds the meshes and the transforms the
 * file describes, so several instances can share one upload and be placed
 * wherever the game wants. Building nodes from it is up to the game, which
 * decides the material and can move, tint or replace any part.
 */
export class Model extends Resource {
  /** Name of the model. */
  public readonly name: string

  /** Roots of the model. */
  public readonly roots: readonly ModelNode[]

  /** Source the model was read from. */
  public readonly source: string

  /** Materials the parts of the model refer to, in file order. */
  public readonly materials: readonly PbrMaterial[]

  /**
   * @param options - Name, roots, materials and source of the model.
   */
  public constructor({ name, roots, materials = [], source = '' }: ModelOptions) {
    super()
    this.name = name
    this.roots = roots
    this.materials = materials
    this.source = source
  }

  /** Every node of the model, in depth-first order. */
  public get nodes(): readonly ModelNode[] {
    const nodes: ModelNode[] = []
    const visit = (node: ModelNode): void => {
      nodes.push(node)
      for (const child of node.children) visit(child)
    }

    for (const root of this.roots) visit(root)

    return nodes
  }

  /**
   * Bounds of the model with every node transform applied.
   *
   * The geometry of a file is often authored at one scale and shrunk by the node
   * that places it, so a camera must look at the box the parts occupy on screen,
   * not at the raw vertices.
   */
  public get bounds(): Bounds3 | undefined {
    const points: Vector3[] = []
    const visit = (node: ModelNode, parent: Matrix4x4): void => {
      const local = modelNodeMatrix(node.translation, node.rotation, node.scale)
      const world = parent.multiply(local)
      for (const part of node.parts) {
        for (const vertex of part.mesh.vertices) points.push(transform(world, vertex.position))
      }

      for (const child of node.children) visit(child, world)
    }

    for (const root of this.roots) visit(root, Matrix4x4.identity)
    if (points.length === 0) return undefined

    return Bounds3.fromPoints(points)
  }

  /** Meshes of the model, without repeats. */
  public get meshes(): readonly GraphicMesh3D[] {
    return [...new Set(this.nodes.flatMap((node) => node.parts.map((part) => part.mesh)))]
  }

  /** Destroys the geometry the model owns. */
  protected override onDestroy(): void {
    for (const mesh of this.meshes) {
      if (!mesh.destroyed) mesh.destroy()
    }

    for (const material of this.materials) {
      for (const map of material.maps) {
        if (!map.destroyed) map.destroy()
      }
    }

    super.onDestroy()
  }
}

/**
 * Builds the local matrix of a node from its translation, rotation and scale.
 *
 * @param translation - Offset of the node in its parent space.
 * @param rotation - Rotation of the node as a quaternion.
 * @param scale - Scale of the node.
 * @returns The matrix that places the node, in its parent space.
 */
export function modelNodeMatrix(
  translation: Vector3,
  rotation: ModelRotation,
  scale: Vector3,
): Matrix4x4 {
  const { x, y, z, w } = rotation
  const xx = x * x
  const yy = y * y
  const zz = z * z
  const xy = x * y
  const xz = x * z
  const yz = y * z
  const wx = w * x
  const wy = w * y
  const wz = w * z

  return new Matrix4x4(
    (1 - 2 * (yy + zz)) * scale.x,
    2 * (xy + wz) * scale.x,
    2 * (xz - wy) * scale.x,
    0,
    2 * (xy - wz) * scale.y,
    (1 - 2 * (xx + zz)) * scale.y,
    2 * (yz + wx) * scale.y,
    0,
    2 * (xz + wy) * scale.z,
    2 * (yz - wx) * scale.z,
    (1 - 2 * (xx + yy)) * scale.z,
    0,
    translation.x,
    translation.y,
    translation.z,
    1,
  )
}

/**
 * Turns the rotation a file stores into the Euler angles a node uses.
 *
 * glTF states a rotation as a quaternion and nodes use Euler angles, so a model
 * with rotated parts needs the conversion. The order is the one the engine
 * applies: pitch, then yaw, then roll.
 *
 * @param rotation - Rotation of the node as a quaternion.
 * @returns The pitch, yaw and roll of the node, in radians.
 */
export function modelNodeRotation(rotation: ModelRotation): Vector3 {
  const { x, y, z, w } = rotation
  const pitch = Math.asin(Math.min(1, Math.max(-1, 2 * (w * y - z * x))))
  const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z))
  const roll = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y))

  return new Vector3(pitch, yaw, roll)
}

/**
 * Applies a matrix to a point, following the engine matrix convention.
 *
 * @param matrix - Matrix that places the point.
 * @param point - Point to transform.
 * @returns The transformed point.
 */
function transform(matrix: Matrix4x4, point: Vector3): Vector3 {
  return new Vector3(
    matrix.m11 * point.x + matrix.m21 * point.y + matrix.m31 * point.z + matrix.m41,
    matrix.m12 * point.x + matrix.m22 * point.y + matrix.m32 * point.z + matrix.m42,
    matrix.m13 * point.x + matrix.m23 * point.y + matrix.m33 * point.z + matrix.m43,
  )
}
