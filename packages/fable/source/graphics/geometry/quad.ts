import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { Color } from '../primitives/color.js'

import { GraphicMesh2D } from './mesh2d.js'
import { GraphicVertex2D } from './vertex2d.js'

/**
 * Creates an indexed quad from a corner factory.
 *
 * The factory receives the four corners in order, each expressed as `-1` or `1`
 * on its axes: top-left, top-right, bottom-right and bottom-left.
 *
 * @param corner - Factory that produces each corner vertex.
 * @returns A quad made of two triangles.
 */
export function createQuadMesh(corner: (x: number, y: number) => GraphicVertex2D): GraphicMesh2D {
  return new GraphicMesh2D(
    [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)],
    [0, 1, 2, 0, 2, 3],
  )
}

/** A centered unit quad with white vertices, shared by shape nodes. */
export const unitQuadMesh: GraphicMesh2D = createQuadMesh(
  (x, y) =>
    new GraphicVertex2D(
      new Vector2(x * 0.5, y * 0.5),
      new Vector2(x < 0 ? 0 : 1, y < 0 ? 0 : 1),
      Color.white,
    ),
)
