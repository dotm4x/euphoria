import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { type GraphicMesh2D } from '../../../../geometry/mesh2d.js'
import { createQuadMesh } from '../../../../geometry/quad.js'
import { GraphicVertex2D } from '../../../../geometry/vertex2d.js'
import { Color } from '../../../../primitives/color.js'

/** Normalized texture coordinates of a sprite within its texture atlas. */
export interface SpriteRegion {
  /** Normalized coordinate of the top-left corner. */
  readonly min: Vector2
  /** Normalized coordinate of the bottom-right corner. */
  readonly max: Vector2
}

/** A unit square covering the whole texture. */
export const fullSpriteRegion: SpriteRegion = Object.freeze({
  min: new Vector2(0, 0),
  max: new Vector2(1, 1),
})

/**
 * Validates a sprite region.
 *
 * @param region - Region to validate.
 * @throws {@link RangeError} If a coordinate is outside zero to one or the
 * region is inverted.
 */
export function validateSpriteRegion(region: SpriteRegion): void {
  for (const value of [region.min.x, region.min.y, region.max.x, region.max.y]) {
    if (value < 0 || value > 1) {
      throw new RangeError('Sprite regions must be normalized between zero and one.')
    }
  }

  if (region.max.x < region.min.x || region.max.y < region.min.y) {
    throw new RangeError('Sprite regions must not be inverted.')
  }
}

/**
 * Creates a centered unit quad that samples a region of its texture.
 *
 * @param region - Region of the texture sampled by the quad.
 * @returns A mesh spanning one unit and centered at the origin.
 */
export function createRegionMesh(region: SpriteRegion): GraphicMesh2D {
  return createQuadMesh(
    (x, y) =>
      new GraphicVertex2D(
        new Vector2(x * 0.5, y * 0.5),
        new Vector2(x < 0 ? region.min.x : region.max.x, y < 0 ? region.min.y : region.max.y),
        Color.white,
      ),
  )
}
