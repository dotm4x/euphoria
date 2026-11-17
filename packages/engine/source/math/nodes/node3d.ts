import { Store } from '#/core/events/store.js'
import { Node, type NodeOptions } from '#/core/node/node.js'

import { Matrix4x4 } from '../primitives/matrices/matrix4x4.js'
import { Vector3 } from '../primitives/vectors/vector3.js'
import { Vector4 } from '../primitives/vectors/vector4.js'

/** Configuration for a node positioned in three-dimensional space. */
export interface Node3DOptions extends NodeOptions {
  /** Initial origin used for rotation and scaling. Defaults to `(0, 0, 0)`. */
  readonly origin?: Vector3
  /** Initial position relative to the nearest {@link Node3D} ancestor. Defaults to `(0, 0, 0)`. */
  readonly position?: Vector3
  /** Initial local rotation in radians, applied as roll, pitch and yaw. Defaults to `(0, 0, 0)`. */
  readonly rotation?: Vector3
  /** Initial local scale. Defaults to `(1, 1, 1)`. */
  readonly scale?: Vector3
}

/**
 * A node positioned in three-dimensional space.
 *
 * Origin, position, rotation and scale determine the transformation of this
 * node and its {@link Node3D} descendants. Rotation is expressed in radians and
 * applied as roll around Z, then pitch around X and finally yaw around Y, which
 * keeps the horizon level when yawing and pitching like an editor camera.
 * Ordinary nodes between `Node3D` instances organize the tree without
 * contributing a transformation.
 */
export class Node3D extends Node {
  /** Origin around which this node and its descendants are scaled and rotated. */
  public readonly origin: Store<Vector3>

  /** Position of the origin relative to the nearest {@link Node3D} ancestor. */
  public readonly position: Store<Vector3>

  /** Local rotation in Euler angles, expressed in radians. */
  public readonly rotation: Store<Vector3>

  /** Local scale. */
  public readonly scale: Store<Vector3>

  private _transform: Matrix4x4 = Matrix4x4.identity
  private _cachedOrigin: Vector3 | undefined
  private _cachedPosition: Vector3 | undefined
  private _cachedRotation: Vector3 | undefined
  private _cachedScale: Vector3 | undefined
  private _transformCached: boolean = false

  /**
   * Creates a three-dimensional node.
   *
   * @param options - Node configuration, including the initial transformation values.
   */
  public constructor({
    origin = new Vector3(0, 0, 0),
    position = new Vector3(0, 0, 0),
    rotation = new Vector3(0, 0, 0),
    scale = new Vector3(1, 1, 1),
    name = 'Node3D',
    ...options
  }: Node3DOptions = {}) {
    super({ ...options, name })
    this.origin = new Store(origin)
    this.position = new Store(position)
    this.rotation = new Store(rotation)
    this.scale = new Store(scale)
  }

  /**
   * World position of this node's origin.
   *
   * Getting the position derives it from {@link globalTransform}. Setting it
   * converts the supplied world position into the local space defined by the
   * {@link Node3D} ancestors and updates {@link position}.
   *
   * @throws {@link Error} If the ancestor transformation cannot be inverted.
   */
  public get globalPosition(): Vector3 {
    const origin = this.origin.value
    const world = this.globalTransform.transform(new Vector4(origin.x, origin.y, origin.z, 1))

    return new Vector3(world.x, world.y, world.z)
  }

  public set globalPosition(value: Vector3) {
    const inverse = this.parentTransform.invert()
    if (inverse === undefined) {
      throw new Error('The Node3D parent transformation cannot be inverted.')
    }

    const local = inverse.transform(new Vector4(value.x, value.y, value.z, 1))
    this.position.value = new Vector3(local.x, local.y, local.z)
  }

  /**
   * World basis of this node, derived from {@link globalTransform}.
   *
   * The basis columns are the right, up and forward axes of the node in world
   * space, before normalization is required by the caller.
   */
  public get globalBasis(): {
    readonly right: Vector3
    readonly up: Vector3
    readonly forward: Vector3
  } {
    const transform = this.globalTransform

    return {
      right: new Vector3(transform.m11, transform.m12, transform.m13),
      up: new Vector3(transform.m21, transform.m22, transform.m23),
      forward: new Vector3(-transform.m31, -transform.m32, -transform.m33),
    }
  }

  /**
   * This node's transformation after applying its {@link Node3D} ancestors.
   *
   * Ancestors that are not `Node3D` instances are skipped. Without a `Node3D`
   * ancestor, the local transformation is the global transformation.
   */
  public get globalTransform(): Matrix4x4 {
    let transform = this.localTransform
    let ancestor = this.parent

    while (ancestor !== undefined) {
      if (ancestor instanceof Node3D) transform = transform.multiply(ancestor.localTransform)

      ancestor = ancestor.parent
    }

    return transform
  }

  /**
   * The transformation defined by this node's local values.
   *
   * The matrix is recalculated only when the origin, position, rotation or
   * scale has changed since the previous read.
   */
  public get localTransform(): Matrix4x4 {
    const origin = this.origin.value
    const position = this.position.value
    const rotation = this.rotation.value
    const scale = this.scale.value

    if (
      !this._transformCached ||
      origin !== this._cachedOrigin ||
      position !== this._cachedPosition ||
      rotation !== this._cachedRotation ||
      scale !== this._cachedScale
    ) {
      this._transform = Matrix4x4.translation(-origin.x, -origin.y, -origin.z)
        .multiply(Matrix4x4.scaling(scale.x, scale.y, scale.z))
        .multiply(Matrix4x4.rotationZ(rotation.z))
        .multiply(Matrix4x4.rotationX(rotation.x))
        .multiply(Matrix4x4.rotationY(rotation.y))
        .multiply(Matrix4x4.translation(position.x, position.y, position.z))

      this._cachedOrigin = origin
      this._cachedPosition = position
      this._cachedRotation = rotation
      this._cachedScale = scale
      this._transformCached = true
    }

    return this._transform
  }

  private get parentTransform(): Matrix4x4 {
    let transform = Matrix4x4.identity
    let ancestor = this.parent

    while (ancestor !== undefined) {
      if (ancestor instanceof Node3D) transform = transform.multiply(ancestor.localTransform)

      ancestor = ancestor.parent
    }

    return transform
  }

  protected override onDestroy(): void {
    super.onDestroy()
    if (!this.origin.destroyed) this.origin.destroy()
    if (!this.position.destroyed) this.position.destroy()
    if (!this.rotation.destroyed) this.rotation.destroy()
    if (!this.scale.destroyed) this.scale.destroy()
  }
}
