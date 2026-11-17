import { Store } from '#/core/events/store.js'
import { type Node2D } from '#/math/nodes/node2d.js'
import { Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'
import { type Vector2 } from '#/math/primitives/vectors/vector2.js'

import { type Draw2DCommand } from '../commands/draw2d.js'
import { unitQuadMesh } from '../geometry/quad.js'
import { Color } from '../primitives/color.js'

import { CanvasItem2D, type CanvasItem2DOptions } from './canvas-item.js'

/** Configuration for a trail node. */
export interface TrailNodeOptions extends CanvasItem2DOptions {
  /** Maximum number of stored points. Defaults to 24. */
  readonly capacity?: number
  /** Width of the trail in local units. Defaults to 8. */
  readonly width?: number
  /** Minimum distance between stored points. Defaults to 4. */
  readonly minimumDistance?: number
  /** Color at the head of the trail. Defaults to white. */
  readonly color?: Color
  /** Node sampled every update, or undefined to add points manually. */
  readonly follow?: Node2D
}

/**
 * A fading trail of segments that follows a node or user-supplied points.
 *
 * The trail samples the position of the followed node while it moves, then
 * draws one quad per pair of points, fading towards the tail.
 */
export class TrailNode extends CanvasItem2D {
  /** Width of the trail in local units. */
  public readonly width: Store<number>

  /** Minimum distance between stored points. */
  public readonly minimumDistance: Store<number>

  /** Color at the head of the trail. */
  public readonly color: Store<Color>

  private readonly _capacity: number

  private readonly _follow: Node2D | undefined
  private readonly _points: Vector2[] = []
  private _lastSampled: Vector2 | undefined
  /**
   * @param options - Capacity, width, sampling distance, color and target node.
   * @throws {@link RangeError} If the capacity is not a positive integer.
   */
  public constructor({
    capacity = 24,
    width = 8,
    minimumDistance = 4,
    color = Color.white,
    follow,
    ...options
  }: TrailNodeOptions = {}) {
    super(options)
    if (!Number.isInteger(capacity) || capacity < 2) {
      throw new RangeError('A trail requires a capacity of at least two points.')
    }

    this._capacity = capacity
    this._follow = follow
    this.width = new Store(width)
    this.minimumDistance = new Store(minimumDistance)
    this.color = new Store(color)
  }

  /** Number of stored points. */
  public get pointCount(): number {
    return this._points.length
  }

  /**
   * Adds a point to the head of the trail.
   *
   * @param point - Position in the space of the trail.
   */
  public addPoint(point: Vector2): void {
    this._points.push(point)
    while (this._points.length > this._capacity) this._points.shift()
  }

  /** Removes every stored point. */
  public clear(): void {
    this._points.length = 0
    this._lastSampled = undefined
  }

  /**
   * Samples the followed node and appends a point when it moved far enough.
   *
   * @param context - Elapsed time since the previous update. Sampling does not
   * depend on it, so the node also works with variable frame rates.
   */
  public update(_context: { readonly deltaTime: number }): void {
    const follow = this._follow
    if (follow === undefined || this.destroyed) return
    const position = follow.globalPosition
    const previous = this._lastSampled
    if (
      previous !== undefined &&
      Math.hypot(position.x - previous.x, position.y - previous.y) < this.minimumDistance.value
    ) {
      return
    }

    const inverse = this.globalTransform.invert()
    this.addPoint(inverse === undefined ? position : inverse.transform(position))
    this._lastSampled = position
  }

  /** @inheritDoc */
  protected override collectDraw(commands: Draw2DCommand[]): void {
    const points = this._points
    const width = this.width.value
    const color = this.color.value
    for (let index = 1; index < points.length; index++) {
      const start = points[index - 1]
      const end = points[index]
      if (start === undefined || end === undefined) continue
      const dx = end.x - start.x
      const dy = end.y - start.y
      const length = Math.hypot(dx, dy)
      if (length === 0) continue
      const progress = index / Math.max(1, points.length - 1)
      const tint = new Color(color.r, color.g, color.b, color.a * progress)
      const transform = Matrix3x2.scaling(length, width * progress)
        .multiply(Matrix3x2.rotation(Math.atan2(dy, dx)))
        .multiply(Matrix3x2.translation((start.x + end.x) / 2, (start.y + end.y) / 2))
      commands.push(this.createCommand(unitQuadMesh, transform, { tint }))
    }
  }

  protected override onDestroy(): void {
    super.onDestroy()
    this.clear()
    if (!this.width.destroyed) this.width.destroy()
    if (!this.minimumDistance.destroyed) this.minimumDistance.destroy()
    if (!this.color.destroyed) this.color.destroy()
  }
}
