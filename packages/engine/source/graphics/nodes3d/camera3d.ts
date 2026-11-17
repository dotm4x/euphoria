import { Store } from '#/core/events/store.js'
import { Node3D, type Node3DOptions } from '#/math/nodes/node3d.js'
import { Matrix4x4 } from '#/math/primitives/matrices/matrix4x4.js'

import { type Camera } from '../interfaces/camera.js'
import { type Viewport } from '../primitives/viewport.js'

/** Projection used by a three-dimensional camera. */
export enum Camera3DProjection {
  /** Perspective projection with a field of view. */
  perspective = 'perspective',
  /** Orthographic projection with a fixed vertical size. */
  orthographic = 'orthographic',
}

/** Configuration for a three-dimensional camera. */
export interface Camera3DOptions extends Node3DOptions {
  /** Projection kind. Defaults to perspective. */
  readonly projection?: Camera3DProjection
  /** Vertical field of view in radians, used by perspective projections. Defaults to 60°. */
  readonly fieldOfView?: number
  /** Vertical size in world units, used by orthographic projections. Defaults to ten units. */
  readonly size?: number
  /** Distance to the near plane. Defaults to 0.1. */
  readonly near?: number
  /** Distance to the far plane. Defaults to 1000. */
  readonly far?: number
}

/**
 * A three-dimensional camera positioned in the scene.
 *
 * The camera looks towards its local negative Z axis. The view keeps the world
 * basis of the node and inverts its translation, so moving or rotating the node
 * moves or rotates the camera.
 */
export class Camera3D extends Node3D implements Camera {
  /** Projection kind. */
  public readonly projection: Store<Camera3DProjection>

  /** Vertical field of view in radians. */
  public readonly fieldOfView: Store<number>

  /** Vertical size in world units for orthographic projections. */
  public readonly size: Store<number>

  /** Distance to the near plane. */
  public readonly near: Store<number>

  /** Distance to the far plane. */
  public readonly far: Store<number>

  /**
   * @param options - Node configuration plus projection, field of view, size and planes.
   * @throws {@link RangeError} If a projection value is outside its valid range.
   */
  public constructor({
    projection = Camera3DProjection.perspective,
    fieldOfView = Math.PI / 3,
    size = 10,
    near = 0.1,
    far = 1000,
    ...options
  }: Camera3DOptions = {}) {
    super(options)
    validateFieldOfView(fieldOfView)
    validateSize(size)
    validatePlanes(near, far)
    this.projection = new Store(projection)
    this.fieldOfView = new Store(fieldOfView)
    this.size = new Store(size)
    this.near = new Store(near)
    this.far = new Store(far)
  }

  /** Transformation from world space into camera view space. */
  public get view(): Matrix4x4 {
    const position = this.globalPosition
    const rotation = this.rotation.value

    return Matrix4x4.translation(-position.x, -position.y, -position.z)
      .multiply(Matrix4x4.rotationY(-rotation.y))
      .multiply(Matrix4x4.rotationX(-rotation.x))
      .multiply(Matrix4x4.rotationZ(-rotation.z))
  }

  /**
   * Creates the projection transformation for a viewport.
   *
   * @param viewport - The viewport for which to create the projection.
   * @returns The perspective or orthographic projection.
   */
  public getProjection(viewport: Viewport): Matrix4x4 {
    const near = this.near.value
    const far = this.far.value
    if (this.projection.value === Camera3DProjection.orthographic) {
      const height = this.size.value
      const width = height * viewport.aspectRatio

      return Matrix4x4.orthographicProjection(
        -width / 2,
        width / 2,
        -height / 2,
        height / 2,
        near,
        far,
      )
    }

    return Matrix4x4.perspectiveFieldOfView(this.fieldOfView.value, viewport.aspectRatio, near, far)
  }

  protected override onDestroy(): void {
    for (const store of [this.projection, this.fieldOfView, this.size, this.near, this.far]) {
      if (!store.destroyed) store.destroy()
    }

    super.onDestroy()
  }
}

function validateFieldOfView(value: number): void {
  if (!Number.isFinite(value) || value <= 0 || value >= Math.PI) {
    throw new RangeError('The field of view must be between zero and pi radians.')
  }
}

function validateSize(value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError('The orthographic size must be greater than zero.')
  }
}

function validatePlanes(near: number, far: number): void {
  if (!Number.isFinite(near) || near <= 0 || !Number.isFinite(far) || far <= near) {
    throw new RangeError('The far plane must be farther than the near plane.')
  }
}
