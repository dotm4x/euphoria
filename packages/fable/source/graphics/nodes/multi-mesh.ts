import { Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'

import { type Draw2DCommand } from '../commands/draw2d.js'
import { type GraphicMesh2D } from '../geometry/mesh2d.js'
import { type Color } from '../primitives/color.js'

import { CanvasItem2D, type CanvasItem2DOptions } from './canvas-item.js'

/** Configuration for a multi-mesh node. */
export interface MultiMeshNodeOptions extends CanvasItem2DOptions {
  /** Mesh shared by every instance. */
  readonly mesh: GraphicMesh2D
  /** Number of instances. Defaults to the number of initial transforms. */
  readonly count?: number
  /** Initial transforms of the instances. */
  readonly transforms?: Iterable<Matrix3x2>
}

/**
 * A node that draws many instances of one mesh.
 *
 * Instances are stored as transformations and optional colors, and every
 * instance becomes a command sharing the mesh and material, so the backend
 * batches the whole node into one draw call. GPU instancing is left to a future
 * backend feature; the interface stays the same.
 */
export class MultiMeshNode extends CanvasItem2D {
  /** Mesh shared by every instance, borrowed from the caller. */
  public readonly mesh: GraphicMesh2D

  private readonly _transforms: Matrix3x2[] = []

  private readonly _colors: (Color | undefined)[] = []

  private _activeCount: number = 0

  /**
   * @param options - Shared mesh, instance count and initial transforms.
   * @throws {@link RangeError} If the count is not a positive integer.
   */
  public constructor({ mesh, count, transforms = [], ...options }: MultiMeshNodeOptions) {
    super(options)
    this.mesh = mesh
    for (const transform of transforms) this._transforms.push(transform)
    const total = count ?? this._transforms.length
    if (!Number.isInteger(total) || total < 0) {
      throw new RangeError('A multi-mesh requires a nonnegative instance count.')
    }

    while (this._transforms.length < total) this._transforms.push(Matrix3x2.identity)
    this._colors.length = this._transforms.length
    this._activeCount = this._transforms.length
  }

  /** Number of instances. */
  public get count(): number {
    return this._transforms.length
  }

  /** Number of drawn instances. */
  public get activeCount(): number {
    return this._activeCount
  }

  /**
   * Sets how many instances are drawn.
   *
   * @param count - Number of leading instances to draw.
   * @throws {@link RangeError} If the count is outside the instance range.
   */
  public setActiveCount(count: number): void {
    if (!Number.isInteger(count) || count < 0 || count > this._transforms.length) {
      throw new RangeError('The active count is outside the multi-mesh range.')
    }

    this._activeCount = count
  }

  /**
   * Sets the transformation of an instance.
   *
   * @param index - Instance index.
   * @param transform - Transformation applied to the shared mesh.
   * @throws {@link RangeError} If the index is outside the instance range.
   */
  public setTransform(index: number, transform: Matrix3x2): void {
    this.assertIndex(index)
    this._transforms[index] = transform
  }

  /**
   * Sets the color of an instance.
   *
   * @param index - Instance index.
   * @param color - Tint of the instance, or undefined to use the node tint.
   * @throws {@link RangeError} If the index is outside the instance range.
   */
  public setColor(index: number, color: Color | undefined): void {
    this.assertIndex(index)
    this._colors[index] = color
  }

  /** @inheritDoc */
  protected override collectDraw(commands: Draw2DCommand[]): void {
    for (let index = 0; index < this._activeCount; index++) {
      const transform = this._transforms[index]
      if (transform === undefined) continue
      commands.push(this.createCommand(this.mesh, transform, { tint: this._colors[index] }))
    }
  }

  private assertIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this._transforms.length) {
      throw new RangeError('The instance index is outside the multi-mesh range.')
    }
  }
}
