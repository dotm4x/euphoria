import { Vector3 } from '../primitives/vectors/vector3.js'

/** An axis-aligned three-dimensional bounding box. */
export class Bounds3 {
  /** Minimum corner. */
  public readonly min: Vector3

  /** Maximum corner. */
  public readonly max: Vector3

  /**
   * @param min - Minimum corner.
   * @param max - Maximum corner; each component must be greater than or equal to `min`.
   * @throws {@link RangeError} If a maximum component is below its minimum.
   */
  public constructor(min: Vector3, max: Vector3) {
    if (max.x < min.x || max.y < min.y || max.z < min.z) {
      throw new RangeError('Bounds maximum must not be below the minimum.')
    }

    this.min = min
    this.max = max
  }

  /** Width, height and depth of the bounds. */
  public get size(): Vector3 {
    return new Vector3(this.max.x - this.min.x, this.max.y - this.min.y, this.max.z - this.min.z)
  }

  /** Center of the bounds. */
  public get center(): Vector3 {
    return new Vector3(
      (this.min.x + this.max.x) / 2,
      (this.min.y + this.max.y) / 2,
      (this.min.z + this.max.z) / 2,
    )
  }

  /**
   * Creates the bounds that contain every point.
   *
   * @param points - The points to enclose.
   * @returns The enclosing bounds.
   * @throws {@link Error} If no points are supplied.
   */
  public static fromPoints(points: Iterable<Vector3>): Bounds3 {
    let minimumX = Number.POSITIVE_INFINITY
    let minimumY = Number.POSITIVE_INFINITY
    let minimumZ = Number.POSITIVE_INFINITY
    let maximumX = Number.NEGATIVE_INFINITY
    let maximumY = Number.NEGATIVE_INFINITY
    let maximumZ = Number.NEGATIVE_INFINITY
    let count = 0
    for (const point of points) {
      minimumX = Math.min(minimumX, point.x)
      minimumY = Math.min(minimumY, point.y)
      minimumZ = Math.min(minimumZ, point.z)
      maximumX = Math.max(maximumX, point.x)
      maximumY = Math.max(maximumY, point.y)
      maximumZ = Math.max(maximumZ, point.z)
      count++
    }

    if (count === 0) {
      throw new Error('Bounds require at least one point.')
    }

    return new Bounds3(
      new Vector3(minimumX, minimumY, minimumZ),
      new Vector3(maximumX, maximumY, maximumZ),
    )
  }

  /**
   * Checks whether a point lies inside the bounds, including their faces.
   *
   * @param point - The point to check.
   * @returns Whether the point is contained.
   */
  public contains(point: Vector3): boolean {
    return (
      point.x >= this.min.x &&
      point.x <= this.max.x &&
      point.y >= this.min.y &&
      point.y <= this.max.y &&
      point.z >= this.min.z &&
      point.z <= this.max.z
    )
  }

  /**
   * Checks whether two bounds overlap, including their faces.
   *
   * @param other - The bounds to test.
   * @returns Whether the bounds intersect.
   */
  public intersects(other: Bounds3): boolean {
    return (
      this.min.x <= other.max.x &&
      this.max.x >= other.min.x &&
      this.min.y <= other.max.y &&
      this.max.y >= other.min.y &&
      this.min.z <= other.max.z &&
      this.max.z >= other.min.z
    )
  }

  /**
   * Lists the eight corners of the bounds.
   *
   * @returns The corners, starting at the minimum corner and alternating axes.
   */
  public corners(): readonly Vector3[] {
    const { min, max } = this

    return [
      min,
      new Vector3(max.x, min.y, min.z),
      new Vector3(max.x, max.y, min.z),
      new Vector3(min.x, max.y, min.z),
      new Vector3(min.x, min.y, max.z),
      new Vector3(max.x, min.y, max.z),
      max,
      new Vector3(min.x, max.y, max.z),
    ]
  }
}
