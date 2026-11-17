import { Resource } from '#/core/primitives/resource.js'

/** Surface properties shared by colliders. */
export interface PhysicsMaterialOptions {
  /** Coulomb friction coefficient; defaults to `0.5`. */
  readonly friction?: number
  /** Bounciness, from `0` (no bounce) to `1` (full restitution); defaults to `0`. */
  readonly restitution?: number
  /** Mass per unit area; defaults to `1`. */
  readonly density?: number
}

/**
 * Describes how a collider interacts with other colliders.
 *
 * Materials are immutable values, so descriptors that keep the same material
 * can be compared by reference. They are resources, so they can be shared
 * between colliders and are destroyed by their creator.
 */
export class PhysicsMaterial extends Resource {
  /** Coulomb friction coefficient. */
  public readonly friction: number

  /** Bounciness, from `0` to `1`. */
  public readonly restitution: number

  /** Mass per unit area. */
  public readonly density: number

  /**
   * @param options - Friction, restitution and density.
   * @throws {@link RangeError} If a value is not finite or is negative.
   */
  public constructor({
    friction = 0.5,
    restitution = 0,
    density = 1,
  }: PhysicsMaterialOptions = {}) {
    super()
    if (!Number.isFinite(friction) || friction < 0) {
      throw new RangeError('Physics material friction must be finite and non-negative.')
    }

    if (!Number.isFinite(restitution) || restitution < 0) {
      throw new RangeError('Physics material restitution must be finite and non-negative.')
    }

    if (!Number.isFinite(density) || density <= 0) {
      throw new RangeError('Physics material density must be finite and positive.')
    }

    this.friction = friction
    this.restitution = restitution
    this.density = density
  }

  /**
   * Compares this material with another by value.
   *
   * @param other - The material to compare with.
   * @param tolerance - Absolute tolerance used for every coefficient.
   * @returns Whether every coefficient is equal within the tolerance.
   */
  public equals(other: PhysicsMaterial, tolerance: number = 1e-6): boolean {
    return (
      Math.abs(this.friction - other.friction) <= tolerance &&
      Math.abs(this.restitution - other.restitution) <= tolerance &&
      Math.abs(this.density - other.density) <= tolerance
    )
  }
}
