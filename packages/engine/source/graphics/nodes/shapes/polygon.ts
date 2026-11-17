import { Store } from '#/core/events/store.js'
import { Bounds2 } from '#/math/geometry/bounds2.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { GraphicMesh2D } from '../../geometry/mesh2d.js'
import { GraphicVertex2D } from '../../geometry/vertex2d.js'
import { Color } from '../../primitives/color.js'
import { CanvasItem2D, type CanvasItem2DOptions } from '../canvas-item.js'

/** Configuration for a polygon node. */
export interface PolygonNodeOptions extends CanvasItem2DOptions {
  /** Vertices of the polygon in local units, in winding order. */
  readonly polygon: Iterable<Vector2>
}

/**
 * A convex polygon built by triangulating its vertices as a fan.
 *
 * Concave polygons cannot be represented by a fan and must be split into
 * several nodes or drawn with a mesh. Changing the polygon rebuilds the
 * geometry and releases the previous GPU copy.
 */
export class PolygonNode extends CanvasItem2D {
  /** Vertices of the polygon, in winding order. */
  public readonly polygon: Store<readonly Vector2[]>

  private _mesh: GraphicMesh2D | undefined
  private _meshPolygon: readonly Vector2[] | undefined

  /**
   * @param options - Transformation, material, tint and vertices.
   * @throws {@link Error} If the polygon has fewer than three vertices.
   */
  public constructor({ polygon, ...options }: PolygonNodeOptions) {
    super(options)
    const points = [...polygon]
    if (points.length < 3) {
      throw new Error('A polygon requires at least three vertices.')
    }

    this.polygon = new Store<readonly Vector2[]>(Object.freeze(points))
  }

  /** @inheritDoc */
  protected override get shapeMesh(): GraphicMesh2D {
    const polygon = this.polygon.value
    if (this._mesh !== undefined && this._meshPolygon === polygon) return this._mesh
    if (this._mesh !== undefined && !this._mesh.destroyed) this._mesh.destroy()
    this._mesh = createPolygonMesh(polygon)
    this._meshPolygon = polygon

    return this._mesh
  }

  protected override onDestroy(): void {
    super.onDestroy()
    if (this._mesh !== undefined && !this._mesh.destroyed) this._mesh.destroy()
    if (!this.polygon.destroyed) this.polygon.destroy()
  }
}

function createPolygonMesh(polygon: readonly Vector2[]): GraphicMesh2D {
  const bounds = Bounds2.fromPoints(polygon)
  const size = bounds.size
  const vertices = polygon.map(
    (point) =>
      new GraphicVertex2D(
        point,
        new Vector2(
          size.x === 0 ? 0.5 : (point.x - bounds.min.x) / size.x,
          size.y === 0 ? 0.5 : (point.y - bounds.min.y) / size.y,
        ),
        Color.white,
      ),
  )
  const indices: number[] = []
  for (let index = 1; index < vertices.length - 1; index++) {
    indices.push(0, index, index + 1)
  }

  return new GraphicMesh2D(vertices, indices)
}
