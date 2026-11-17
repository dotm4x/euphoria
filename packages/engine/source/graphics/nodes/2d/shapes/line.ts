import { Store } from '#/core/events/store.js'
import { Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'
import { type Vector2 } from '#/math/primitives/vectors/vector2.js'

import { type Draw2DCommand } from '../../../commands/draw2d.js'
import { unitQuadMesh } from '../../../geometry/quad.js'
import { CanvasItem2D, type CanvasItem2DOptions } from '../canvas-item.js'

/** Configuration for a line node. */
export interface LineNodeOptions extends CanvasItem2DOptions {
  /** Points of the polyline in local units. */
  readonly points: Iterable<Vector2>
  /** Width of the line in local units. Defaults to one. */
  readonly width?: number
  /** Round joins drawn as squares at each inner point. Defaults to true. */
  readonly joined?: boolean
  /** Whether the last point connects to the first one. Defaults to false. */
  readonly closed?: boolean
}

/**
 * A thick polyline built from one quad per segment.
 *
 * Every segment is a command that shares the same unit quad, so a line batches
 * into a single draw call together with the sprites of its material.
 */
export class LineNode extends CanvasItem2D {
  /** Points of the polyline, in local units. */
  public readonly points: Store<readonly Vector2[]>

  /** Width of the line, in local units. */
  public readonly width: Store<number>

  /** Whether the last point connects to the first one. */
  public readonly closed: Store<boolean>

  /** Whether joins are drawn at inner points. */
  public readonly joined: Store<boolean>

  /**
   * @param options - Transformation, material, tint, points and width.
   * @throws {@link Error} If the line has fewer than two points.
   */
  public constructor({
    points,
    width = 1,
    joined = true,
    closed = false,
    ...options
  }: LineNodeOptions) {
    super(options)
    const list = [...points]
    if (list.length < 2) {
      throw new Error('A line requires at least two points.')
    }

    this.points = new Store<readonly Vector2[]>(Object.freeze(list))
    this.width = new Store(width)
    this.closed = new Store(closed)
    this.joined = new Store(joined)
  }

  /** @inheritDoc */
  protected override collectDraw(commands: Draw2DCommand[]): void {
    const points = this.points.value
    const width = this.width.value
    const total = this.closed.value ? points.length : points.length - 1
    for (let index = 0; index < total; index++) {
      const start = points[index]
      const end = points[(index + 1) % points.length]
      if (start === undefined || end === undefined) continue
      const segment = segmentTransform(start, end, width)
      if (segment === undefined) continue
      commands.push(this.createCommand(unitQuadMesh, segment))
      if (this.joined.value && (index > 0 || this.closed.value)) {
        commands.push(this.createCommand(unitQuadMesh, squareTransform(start, width)))
      }
    }
  }

  protected override onDestroy(): void {
    super.onDestroy()
    if (!this.points.destroyed) this.points.destroy()
    if (!this.width.destroyed) this.width.destroy()
    if (!this.closed.destroyed) this.closed.destroy()
    if (!this.joined.destroyed) this.joined.destroy()
  }
}

function segmentTransform(start: Vector2, end: Vector2, width: number): Matrix3x2 | undefined {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return undefined
  const angle = Math.atan2(dy, dx)
  const middleX = (start.x + end.x) / 2
  const middleY = (start.y + end.y) / 2

  return Matrix3x2.scaling(length, width)
    .multiply(Matrix3x2.rotation(angle))
    .multiply(Matrix3x2.translation(middleX, middleY))
}

function squareTransform(point: Vector2, width: number): Matrix3x2 {
  return Matrix3x2.scaling(width, width).multiply(Matrix3x2.translation(point.x, point.y))
}
