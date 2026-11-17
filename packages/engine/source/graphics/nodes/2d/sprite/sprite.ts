import { Store } from '#/core/events/store.js'
import { Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { type GraphicMesh2D } from '../../../geometry/mesh2d.js'
import { type Color } from '../../../primitives/color.js'
import { CanvasItem2D, type CanvasItem2DOptions } from '../canvas-item.js'

import {
  createRegionMesh,
  fullSpriteRegion,
  type SpriteRegion,
  validateSpriteRegion,
} from './resources/region.js'

/** Configuration for a sprite node. */
export interface SpriteNodeOptions extends CanvasItem2DOptions {
  /** Size of the sprite in local units. Defaults to one unit. */
  readonly size?: Vector2
  /** Region of the texture sampled by the sprite. Defaults to the whole texture. */
  readonly region?: SpriteRegion
  /** Color multiplied with the texture. Defaults to white. */
  readonly color?: Color
  /** Whether the sprite is centered on its origin. Defaults to true. */
  readonly centered?: boolean
}

/**
 * A textured quad with an optional atlas region.
 *
 * The geometry only depends on the region: size, tint and flips are applied by
 * the transformation and the tint of the command, so sprites sharing a material
 * are batched by the backend.
 */
export class SpriteNode extends CanvasItem2D {
  /** Size of the sprite in local units. */
  public readonly size: Store<Vector2>

  /** Region of the texture sampled by the sprite. */
  public readonly region: Store<SpriteRegion>

  /** Whether the sprite is centered on its origin. */
  public readonly centered: boolean

  private _mesh: GraphicMesh2D | undefined
  private _meshRegion: SpriteRegion | undefined

  /**
   * @param options - Transformation, material, size, region and color.
   * @throws {@link RangeError} If the region is not normalized or is inverted.
   */
  public constructor({
    size = new Vector2(1, 1),
    region = fullSpriteRegion,
    color,
    centered = true,
    ...options
  }: SpriteNodeOptions = {}) {
    validateSpriteRegion(region)
    super({ ...(color === undefined ? {} : { selfModulate: color }), ...options })
    this.size = new Store(size)
    this.region = new Store(region)
    this.centered = centered
  }

  /** @inheritDoc */
  protected override get shapeMesh(): GraphicMesh2D {
    const region = this.region.value
    if (this._mesh === undefined || this._meshRegion !== region) {
      if (this._mesh !== undefined && !this._mesh.destroyed) this._mesh.destroy()
      validateSpriteRegion(region)
      this._mesh = createRegionMesh(region)
      this._meshRegion = region
    }

    return this._mesh
  }

  /** @inheritDoc */
  protected override get shapeTransform(): Matrix3x2 {
    const size = this.size.value
    const transform = Matrix3x2.scaling(size.x, size.y)
    if (this.centered) return transform

    return transform.multiply(Matrix3x2.translation(size.x / 2, size.y / 2))
  }

  protected override onDestroy(): void {
    super.onDestroy()
    if (this._mesh !== undefined && !this._mesh.destroyed) this._mesh.destroy()
    if (!this.size.destroyed) this.size.destroy()
    if (!this.region.destroyed) this.region.destroy()
  }
}
