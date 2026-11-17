import { Color, GraphicMesh2D, GraphicVertex2D, Vector2 } from '@euphoria/engine'

/**
 * Creates the gradient triangle used by the demo.
 *
 * @returns A mesh with vertex colors and texture coordinates.
 */
export function createTriangleMesh(): GraphicMesh2D {
  return new GraphicMesh2D([
    new GraphicVertex2D(new Vector2(-140, -80), new Vector2(0, 0), Color.white),
    new GraphicVertex2D(new Vector2(140, -80), new Vector2(1, 0), Color.white),
    new GraphicVertex2D(new Vector2(0, 120), new Vector2(0.5, 1), Color.white),
  ])
}
