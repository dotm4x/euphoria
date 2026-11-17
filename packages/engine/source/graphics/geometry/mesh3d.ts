import { Bounds3 } from '#/math/geometry/bounds3.js'
import { Mesh } from '#/math/geometry/mesh.js'

import { type Vertex3D } from './vertex3d.js'

/**
 * Indexed three-dimensional geometry prepared for graphical rendering.
 *
 * Each vertex contains the attributes required by the standard
 * three-dimensional rendering pipeline: its position, its normal and its
 * texture coordinate. The mesh describes geometry only and never creates
 * textures or GPU resources.
 */
export class GraphicMesh3D extends Mesh<Vertex3D> {
  /** Local axis-aligned bounds of the mesh vertices. */
  public readonly bounds: Bounds3

  /**
   * @param vertices - The vertices to copy.
   * @param indices - The triangle indices to copy, or null to use the vertices
   * sequentially in groups of three.
   * @throws {@link Error} If there are no complete triangles, an index refers
   * to a vertex outside the mesh, or a vertex contains nonfinite values.
   */
  public constructor(vertices: Iterable<Vertex3D>, indices?: Iterable<number> | null) {
    super(validateVertices(vertices), indices)
    this.bounds = Bounds3.fromPoints(this.vertices.map((vertex) => vertex.position))
  }
}

function validateVertices(vertices: Iterable<Vertex3D>): Vertex3D[] {
  const validated: Vertex3D[] = []
  let position = 0

  for (const vertex of vertices) {
    if (
      !Number.isFinite(vertex.position.x) ||
      !Number.isFinite(vertex.position.y) ||
      !Number.isFinite(vertex.position.z) ||
      !Number.isFinite(vertex.textureCoordinate.x) ||
      !Number.isFinite(vertex.textureCoordinate.y)
    ) {
      throw new Error(`Vertex ${String(position)} contains nonfinite values.`)
    }

    validated.push(vertex)
    position++
  }

  return validated
}
