import { type Vector2 } from '#/math/primitives/vectors/vector2.js'
import { type Vector3 } from '#/math/primitives/vectors/vector3.js'

/**
 * A three-dimensional vertex prepared for graphical rendering.
 *
 * The vertex holds its local position, normal and texture coordinate. It is
 * immutable and compared by value.
 */
export class Vertex3D {
  /** Local position of the vertex. */
  public readonly position: Vector3

  /** Unit normal used by lighting. */
  public readonly normal: Vector3

  /** Texture coordinate associated with the vertex. */
  public readonly textureCoordinate: Vector2

  /**
   * @param position - The local position of the vertex.
   * @param normal - The normal of the vertex; it must not be zero.
   * @param textureCoordinate - The texture coordinate associated with the vertex.
   * @throws {@link RangeError} If the normal has no length.
   */
  public constructor(position: Vector3, normal: Vector3, textureCoordinate: Vector2) {
    if (normal.squaredMagnitude === 0) {
      throw new RangeError('Vertex normals must not be zero.')
    }

    this.position = position
    this.normal = normal.normalize()
    this.textureCoordinate = textureCoordinate
  }

  /**
   * Compares this vertex with another by value.
   *
   * @param other - The vertex to compare with.
   * @param tolerance - Absolute tolerance used for the attributes.
   * @returns Whether both vertices have equal attributes.
   */
  public equals(other: Vertex3D, tolerance = 1e-10): boolean {
    return (
      this.position.equals(other.position, tolerance) &&
      this.normal.equals(other.normal, tolerance) &&
      this.textureCoordinate.equals(other.textureCoordinate, tolerance)
    )
  }
}
