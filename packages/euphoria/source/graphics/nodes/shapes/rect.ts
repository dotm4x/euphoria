import { Store } from '#/core/events/store.js'
import { Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { type GraphicMesh2D } from '../../geometry/mesh2d.js'
import { unitQuadMesh } from '../../geometry/quad.js'
import { CanvasItem2D, type CanvasItem2DOptions } from '../canvas-item.js'

/** Configuration for a rectangle node. */
export interface RectNodeOptions extends CanvasItem2DOptions {
  /** Size of the rectangle in local units. Defaults to one unit. */
  readonly size?: Vector2
}

/**
 * A solid rectangle centered on its origin.
 *
 * The rectangle samples the texture of its material when it has one, so it can
 * also be used as a textured quad.
 */
export class RectNode extends CanvasItem2D {
  /** Size of the rectangle in local units. */
  public readonly size: Store<Vector2>

  /**
   * @param options - Transformation, material, tint and size.
   */
  public constructor({ size = new Vector2(1, 1), ...options }: RectNodeOptions = {}) {
    super(options)
    this.size = new Store(size)
  }

  /** @inheritDoc */
  protected override get shapeMesh(): GraphicMesh2D {
    return unitQuadMesh
  }

  /** @inheritDoc */
  protected override get shapeTransform(): Matrix3x2 {
    const size = this.size.value

    return Matrix3x2.scaling(size.x, size.y)
  }

  protected override onDestroy(): void {
    if (!this.size.destroyed) this.size.destroy()
    super.onDestroy()
  }
}
