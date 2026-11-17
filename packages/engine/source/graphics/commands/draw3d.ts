import { type Matrix4x4 } from '#/math/primitives/matrices/matrix4x4.js'
import { Vector4 } from '#/math/primitives/vectors/vector4.js'

import { type GraphicMesh3D } from '../geometry/mesh3d.js'
import { type Color } from '../primitives/color.js'
import { BlendMode } from '../resources/blend-mode.js'
import { type LightEnvironment } from '../resources/light-environment.js'
import { type GraphicMaterial } from '../resources/material.js'

import { type SortableCommand } from './command.js'

/** Options for drawing three-dimensional geometry. */
export interface Draw3DCommandOptions {
  /** Mesh containing the geometry to draw. */
  readonly mesh: GraphicMesh3D
  /** Material defining how the geometry is drawn. */
  readonly material: GraphicMaterial
  /** World transformation applied to the geometry. */
  readonly transform: Matrix4x4
  /** Lights sampled by the material, or undefined for ambient darkness. */
  readonly environment?: LightEnvironment | undefined
  /** Draw order within the space; lower orders are drawn first. Defaults to zero. */
  readonly order?: number
  /** Color multiplied with the rendered color. Defaults to white. */
  readonly tint?: Color | undefined
  /** Blend mode that overrides the material one, or undefined to use the material. */
  readonly blend?: BlendMode | undefined
}

/**
 * A command to draw three-dimensional geometry.
 *
 * Backends combine the world transformation with the camera view and the
 * projection for the current viewport, apply depth testing and sample the
 * lights of the environment. Referenced resources are borrowed and not owned by
 * the command.
 */
export class Draw3DCommand implements SortableCommand {
  /** Mesh containing the geometry to draw. */
  public readonly mesh: GraphicMesh3D

  /** Material defining how the geometry is drawn. */
  public readonly material: GraphicMaterial

  /** World transformation applied to the geometry. */
  public readonly transform: Matrix4x4

  /** Lights sampled by the material. */
  public readonly environment: LightEnvironment | undefined

  /** Draw order within the space; lower orders are drawn first. */
  public readonly order: number

  /** Color multiplied with the rendered color. */
  public readonly tint: Color | undefined

  /** Blend mode that overrides the material one. */
  public readonly blend: BlendMode | undefined

  /**
   * @param options - Mesh, material, transform, environment, order, tint and blend.
   */
  public constructor({
    mesh,
    material,
    transform,
    environment,
    order = 0,
    tint,
    blend,
  }: Draw3DCommandOptions) {
    this.mesh = mesh
    this.material = material
    this.transform = transform
    this.environment = environment
    this.order = order
    this.tint = tint
    this.blend = blend
  }

  /** Whether the command blends with the content already drawn. */
  public get transparent(): boolean {
    return (this.blend ?? this.material.blend) !== BlendMode.opaque
  }

  /** Material shared by commands that can batch together. */
  public get batchKey(): unknown {
    return this.material
  }

  /**
   * Returns the distance from the camera to the center of the mesh.
   *
   * @param view - Transformation from world space into view space.
   * @returns The distance along the view direction, where larger values are farther.
   */
  public sortDepth(view: Matrix4x4): number {
    const center = this.mesh.bounds.center
    const world = this.transform.transform(new Vector4(center.x, center.y, center.z, 1))
    const camera = view.transform(world)

    return -camera.z
  }

  /**
   * Checks whether the transformed bounds of the mesh intersect the view volume.
   *
   * @param viewProjection - Combined view and projection transformation.
   * @returns Whether any part of the mesh is inside the view volume.
   */
  public isVisible(viewProjection: Matrix4x4): boolean {
    let outsideLeft = true
    let outsideRight = true
    let outsideBelow = true
    let outsideAbove = true
    let outsideNear = true
    let outsideFar = true
    for (const corner of this.mesh.bounds.corners()) {
      const world = this.transform.transform(new Vector4(corner.x, corner.y, corner.z, 1))
      const clip = viewProjection.transform(world)
      const limit = Math.abs(clip.w)
      if (clip.x >= -limit) outsideLeft = false
      if (clip.x <= limit) outsideRight = false
      if (clip.y >= -limit) outsideBelow = false
      if (clip.y <= limit) outsideAbove = false
      if (clip.z >= -limit) outsideNear = false
      if (clip.z <= limit) outsideFar = false
    }

    return !(
      outsideLeft ||
      outsideRight ||
      outsideBelow ||
      outsideAbove ||
      outsideNear ||
      outsideFar
    )
  }
}
