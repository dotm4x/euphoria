import { Store } from '#/core/events/store.js'
import { Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { type Draw2DCommand } from '../../../commands/draw2d.js'
import { type GraphicMesh2D } from '../../../geometry/mesh2d.js'
import { createQuadMesh } from '../../../geometry/quad.js'
import { GraphicVertex2D } from '../../../geometry/vertex2d.js'
import { Color } from '../../../primitives/color.js'
import { CanvasItem2D, type CanvasItem2DOptions } from '../canvas-item.js'
import {
  fullSpriteRegion,
  type SpriteRegion,
  validateSpriteRegion,
} from '../sprite/resources/region.js'

/** Insets that divide a nine-patch region, in normalized coordinates. */
export interface NinePatchInsets {
  /** Width of the left column. */
  readonly left: number
  /** Width of the right column. */
  readonly right: number
  /** Height of the top row. */
  readonly top: number
  /** Height of the bottom row. */
  readonly bottom: number
}

/** Configuration for a nine-patch node. */
export interface NinePatchNodeOptions extends CanvasItem2DOptions {
  /** Size of the patch in local units. */
  readonly size: Vector2
  /** Region of the texture used as the source patch. Defaults to the whole texture. */
  readonly region?: SpriteRegion
  /** Insets that keep the corners unscaled. Defaults to a third per side. */
  readonly insets?: NinePatchInsets
}

/**
 * A stretchable quad split into nine regions.
 *
 * Corners keep their size while the edges and the center stretch to fill the
 * requested size, which is how panels and buttons are drawn from one texture.
 */
export class NinePatchNode extends CanvasItem2D {
  /** Size of the patch in local units. */
  public readonly size: Store<Vector2>

  /** Region of the texture used as the source patch. */
  public readonly region: Store<SpriteRegion>

  /** Insets that keep the corners unscaled. */
  public readonly insets: Store<NinePatchInsets>

  private _meshes: readonly GraphicMesh2D[] | undefined
  private _meshesRegion: SpriteRegion | undefined
  private _meshesInsets: NinePatchInsets | undefined

  /**
   * @param options - Transformation, material, tint, size, region and insets.
   * @throws {@link RangeError} If the insets do not fit inside the region.
   */
  public constructor({
    size,
    region = fullSpriteRegion,
    insets,
    ...options
  }: NinePatchNodeOptions) {
    super(options)
    validateSpriteRegion(region)
    const normalized = insets ?? defaultInsets()
    validateInsets(normalized)
    this.size = new Store(size)
    this.region = new Store(region)
    this.insets = new Store(normalized)
  }

  private get patchMeshes(): readonly GraphicMesh2D[] {
    const region = this.region.value
    const insets = this.insets.value
    if (
      this._meshes !== undefined &&
      this._meshesRegion === region &&
      this._meshesInsets === insets
    ) {
      return this._meshes
    }

    for (const mesh of this._meshes ?? []) {
      if (!mesh.destroyed) mesh.destroy()
    }

    const width = region.max.x - region.min.x
    const height = region.max.y - region.min.y
    const u = boundaries(region.min.x, width, insets.left, insets.right)
    const v = boundaries(region.min.y, height, insets.top, insets.bottom)
    const meshes: GraphicMesh2D[] = []
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 3; column++) {
        const minU = u[column] ?? 0
        const maxU = u[column + 1] ?? 1
        const minV = v[row] ?? 0
        const maxV = v[row + 1] ?? 1
        meshes.push(
          createQuadMesh(
            (x, y) =>
              new GraphicVertex2D(
                new Vector2(x * 0.5, y * 0.5),
                new Vector2(x < 0 ? minU : maxU, y < 0 ? minV : maxV),
                Color.white,
              ),
          ),
        )
      }
    }

    this._meshes = Object.freeze(meshes)
    this._meshesRegion = region
    this._meshesInsets = insets

    return this._meshes
  }

  /** @inheritDoc */
  protected override collectDraw(commands: Draw2DCommand[]): void {
    const meshes = this.patchMeshes
    const size = this.size.value
    const insets = this.insets.value
    const columns = boundaries(-size.x / 2, size.x, insets.left, insets.right)
    const rows = boundaries(-size.y / 2, size.y, insets.top, insets.bottom)
    let top = rows[0] ?? 0
    for (let row = 0; row < 3; row++) {
      const bottom = rows[row + 1] ?? top
      const height = bottom - top
      let left = columns[0] ?? 0
      for (let column = 0; column < 3; column++) {
        const right = columns[column + 1] ?? left
        const width = right - left
        const mesh = meshes[row * 3 + column]
        if (mesh !== undefined && width > 0 && height > 0) {
          commands.push(
            this.createCommand(
              mesh,
              Matrix3x2.scaling(width, height).multiply(
                Matrix3x2.translation(left + width / 2, top + height / 2),
              ),
            ),
          )
        }

        left = right
      }

      top = bottom
    }
  }

  protected override onDestroy(): void {
    super.onDestroy()
    for (const mesh of this._meshes ?? []) {
      if (!mesh.destroyed) mesh.destroy()
    }

    if (!this.size.destroyed) this.size.destroy()
    if (!this.region.destroyed) this.region.destroy()
    if (!this.insets.destroyed) this.insets.destroy()
  }
}

function defaultInsets(): NinePatchInsets {
  const third = 1 / 3

  return { left: third, right: third, top: third, bottom: third }
}

function validateInsets(insets: NinePatchInsets): void {
  for (const value of [insets.left, insets.right, insets.top, insets.bottom]) {
    if (value < 0 || value > 1) {
      throw new RangeError('Nine-patch insets must be normalized between zero and one.')
    }
  }

  if (insets.left + insets.right > 1 || insets.top + insets.bottom > 1) {
    throw new RangeError('The nine-patch insets must fit inside the region.')
  }
}

function boundaries(min: number, span: number, start: number, end: number): number[] {
  return [min, min + span * start, min + span * (1 - end), min + span]
}
