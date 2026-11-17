import { type Bounds2 } from '#/math/geometry/bounds2.js'
import { type Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'
import { type Matrix4x4 } from '#/math/primitives/matrices/matrix4x4.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'
import { Vector4 } from '#/math/primitives/vectors/vector4.js'

import { type GraphicMesh2D } from '../geometry/mesh2d.js'
import { type Color } from '../primitives/color.js'
import { BlendMode } from '../resources/blend-mode.js'
import { type GraphicMaterial } from '../resources/material.js'

import { type SortableCommand } from './command.js'

/** Options for drawing two-dimensional geometry. */
export interface Draw2DCommandOptions {
  /** Graphical mesh containing the geometry to draw. */
  readonly mesh: GraphicMesh2D
  /** Material defining how the geometry is drawn. */
  readonly material: GraphicMaterial
  /** Transformation applied to the geometry before the camera view. */
  readonly transform: Matrix3x2
  /** Draw order within the space; lower orders are drawn first. Defaults to zero. */
  readonly order?: number
  /** Depth used by spaces that sort back to front. Defaults to zero. */
  readonly depth?: number
  /** Color multiplied with the vertex and texture colors. Defaults to white. */
  readonly tint?: Color | undefined
  /** World rectangle that clips the command, or undefined to draw unclipped. */
  readonly clip?: Bounds2 | undefined
  /** Blend mode that overrides the material one, or undefined to use the material. */
  readonly blend?: BlendMode | undefined
}

/**
 * A command to draw two-dimensional geometry.
 *
 * Backends combine the transform with the camera view and the projection for
 * the current viewport: the two-dimensional transform is applied first,
 * followed by the view and then the projection. Referenced resources are
 * borrowed and not owned by the command.
 */
export class Draw2DCommand implements SortableCommand {
  /** Graphical mesh containing the geometry to draw. */
  public readonly mesh: GraphicMesh2D

  /** Material defining how the geometry is drawn. */
  public readonly material: GraphicMaterial

  /** Transformation applied to the geometry before the camera view. */
  public readonly transform: Matrix3x2

  /** Draw order within the space; lower orders are drawn first. */
  public readonly order: number

  /** Depth used by spaces that sort back to front; larger values are farther away. */
  public readonly depth: number

  /** Color multiplied with the vertex and texture colors. */
  public readonly tint: Color | undefined

  /** World rectangle that clips the command. */
  public readonly clip: Bounds2 | undefined

  /** Blend mode that overrides the material one. */
  public readonly blend: BlendMode | undefined

  /**
   * @param options - Mesh, material, transform, order, depth, tint, clip and blend.
   */
  public constructor({
    mesh,
    material,
    transform,
    order = 0,
    depth = 0,
    tint,
    clip,
    blend,
  }: Draw2DCommandOptions) {
    this.mesh = mesh
    this.material = material
    this.transform = transform
    this.order = order
    this.depth = depth
    this.tint = tint
    this.clip = clip
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
   * Returns the depth used to order the command within a space.
   *
   * @param view - Transformation from world space into view space. Two-dimensional
   * commands do not depend on it.
   * @returns The depth of the command, where larger values are farther away.
   */
  public sortDepth(_view: Matrix4x4): number {
    return this.depth
  }

  /**
   * Checks whether the transformed bounds of the mesh intersect the view volume.
   *
   * @param viewProjection - Combined view and projection transformation.
   * @returns Whether any part of the mesh is inside the view volume.
   */
  public isVisible(viewProjection: Matrix4x4): boolean {
    const { min, max } = this.mesh.bounds
    let outsideLeft = true
    let outsideRight = true
    let outsideBelow = true
    let outsideAbove = true
    for (const corner of [
      new Vector2(min.x, min.y),
      new Vector2(max.x, min.y),
      new Vector2(max.x, max.y),
      new Vector2(min.x, max.y),
    ]) {
      const world = this.transform.transform(corner)
      const clip = viewProjection.transform(new Vector4(world.x, world.y, 0, 1))
      const limit = Math.abs(clip.w)
      if (clip.x >= -limit) outsideLeft = false
      if (clip.x <= limit) outsideRight = false
      if (clip.y >= -limit) outsideBelow = false
      if (clip.y <= limit) outsideAbove = false
    }

    return !(outsideLeft || outsideRight || outsideBelow || outsideAbove)
  }
}
