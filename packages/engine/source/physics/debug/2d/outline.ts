import { Store } from '#/core/events/store.js'
import { Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { GraphicMesh2D } from '../../../graphics/geometry/mesh2d.js'
import { GraphicVertex2D } from '../../../graphics/geometry/vertex2d.js'
import { CanvasItem2D, type CanvasItem2DOptions } from '../../../graphics/nodes/2d/canvas-item.js'
import { Color } from '../../../graphics/primitives/color.js'
import { type ColliderDescriptor2D } from '../../descriptors/2d/collider.js'
import { type Shape2D } from '../../primitives/shape.js'

import { defaultOutlineQuality, type Outline2D, outlineShape2D } from './segments.js'

/** Configuration for a collider outline. */
export interface ColliderOutline2DOptions extends CanvasItem2DOptions {
  /** Colliders to outline. */
  readonly colliders: Iterable<ColliderDescriptor2D>
  /** Width of the outline in local units; defaults to `0.05`. */
  readonly width?: number
  /** Segments used to approximate curved shapes; defaults to 24. */
  readonly quality?: number
}

interface OutlineCache {
  key: readonly (readonly [ColliderDescriptor2D, Shape2D])[]
  mesh: GraphicMesh2D
}

/**
 * Draws the colliders of a body as thick outlines.
 *
 * The outline reads backend-independent collider descriptors and turns them
 * into ordinary drawing geometry, so the same shapes that feed the simulation
 * are previewed without the renderer knowing anything about physics. Place it
 * as a child of the body it describes so it inherits the resolved transform.
 */
export class ColliderOutline2D extends CanvasItem2D {
  private _cache: OutlineCache | undefined

  /** Colliders drawn by this outline. */
  public readonly colliders: Store<readonly ColliderDescriptor2D[]>

  /** Width of the outline in local units. */
  public readonly width: Store<number>

  /** Segments used to approximate curved shapes. */
  public readonly quality: Store<number>

  /**
   * @param options - Transformation, tint, colliders and outline settings.
   */
  public constructor({
    colliders,
    width = 0.05,
    quality = defaultOutlineQuality,
    ...options
  }: ColliderOutline2DOptions) {
    super(options)
    this.colliders = new Store(Object.freeze([...colliders]))
    this.width = new Store(width)
    this.quality = new Store(quality)
  }

  /** @inheritDoc */
  protected override get shapeMesh(): GraphicMesh2D {
    const colliders = this.colliders.value
    const key = colliders.map((collider) => [collider, collider.shape] as const)
    if (this._cache !== undefined && sameKey(this._cache.key, key)) return this._cache.mesh
    const mesh = buildOutlineMesh(colliders, this.width.value, this.quality.value)
    this._cache = { key, mesh }

    return mesh
  }

  /** @inheritDoc */
  protected override get shapeTransform(): Matrix3x2 {
    return Matrix3x2.identity
  }

  /**
   * Replaces the outlined colliders.
   *
   * @param colliders - New colliders to describe.
   */
  public setColliders(colliders: Iterable<ColliderDescriptor2D>): void {
    this.throwIfDestroyed()
    this.colliders.value = Object.freeze([...colliders])
  }

  protected override onDestroy(): void {
    super.onDestroy()
    for (const store of [this.colliders, this.width, this.quality]) {
      if (!store.destroyed) store.destroy()
    }
  }
}

function sameKey(left: OutlineCache['key'], right: OutlineCache['key']): boolean {
  if (left.length !== right.length) return false

  return left.every(([collider, shape], index) => {
    const entry = right[index]

    return entry?.[0] === collider && entry[1] === shape
  })
}

function buildOutlineMesh(
  colliders: readonly ColliderDescriptor2D[],
  width: number,
  quality: number,
): GraphicMesh2D {
  const vertices: GraphicVertex2D[] = []
  const indices: number[] = []
  for (const collider of colliders) {
    for (const outline of outlineShape2D(collider.shape, quality)) {
      const points = place(outline, collider)
      const total = outline.closed ? points.length : points.length - 1
      for (let index = 0; index < total; index++) {
        const start = points[index]
        const end = points[(index + 1) % points.length]
        if (start === undefined || end === undefined) continue
        appendSegment(vertices, indices, start, end, width)
      }
    }
  }

  if (vertices.length === 0) return new GraphicMesh2D([], [])

  return new GraphicMesh2D(vertices, indices)
}

function place(outline: Outline2D, collider: ColliderDescriptor2D): readonly Vector2[] {
  const cosine = Math.cos(collider.rotation)
  const sine = Math.sin(collider.rotation)

  return outline.points.map(
    (point) =>
      new Vector2(
        point.x * cosine - point.y * sine + collider.offset.x,
        point.x * sine + point.y * cosine + collider.offset.y,
      ),
  )
}

function appendSegment(
  vertices: GraphicVertex2D[],
  indices: number[],
  start: Vector2,
  end: Vector2,
  width: number,
): void {
  const delta = end.subtract(start)
  const length = Math.hypot(delta.x, delta.y)
  if (length === 0) return
  const half = width * 0.5
  const normal = new Vector2((-delta.y / length) * half, (delta.x / length) * half)
  const base = vertices.length
  const corners = [start.subtract(normal), end.subtract(normal), end.add(normal), start.add(normal)]
  for (const corner of corners) {
    vertices.push(new GraphicVertex2D(corner, new Vector2(0, 0), Color.white))
  }

  indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
}
