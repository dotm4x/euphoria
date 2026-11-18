/** Curve that fades a voice as it moves away from the listener. */
export enum AttenuationModel {
  /** Gain falls linearly from one to zero between both distances. */
  linear = 'linear',
  /** Gain follows the inverse of the distance, like sound in open air. */
  inverse = 'inverse',
  /** Gain follows the inverse square of the distance, falling faster. */
  exponential = 'exponential',
}

/** Configuration for the distance curve of a voice. */
export interface AttenuationOptions {
  /** Curve applied beyond the minimum distance; defaults to inverse. */
  readonly model?: AttenuationModel
  /** Distance at which the gain is still one, in world units; defaults to `1`. */
  readonly minimumDistance?: number
  /** Distance at which the gain reaches zero, in world units; defaults to `30`. */
  readonly maximumDistance?: number
}

/**
 * Describes how a voice fades with the distance to the listener.
 *
 * Distances below the minimum are heard at full gain, and distances beyond the
 * maximum are silent. In between, the model decides the curve.
 */
export class Attenuation {
  /** Curve applied beyond the minimum distance. */
  public readonly model: AttenuationModel

  /** Distance at which the gain is still one, in world units. */
  public readonly minimumDistance: number

  /** Distance at which the gain reaches zero, in world units. */
  public readonly maximumDistance: number

  /**
   * @param options - Curve and the distances that bound it.
   * @throws {@link RangeError} If a distance is not finite or the bounds are inverted.
   */
  public constructor({
    model = AttenuationModel.inverse,
    minimumDistance = 1,
    maximumDistance = 30,
  }: AttenuationOptions = {}) {
    if (!Number.isFinite(minimumDistance) || minimumDistance <= 0) {
      throw new RangeError('Attenuation minimum distance must be finite and positive.')
    }

    if (!Number.isFinite(maximumDistance) || maximumDistance <= minimumDistance) {
      throw new RangeError('Attenuation maximum distance must be finite and above the minimum.')
    }

    this.model = model
    this.minimumDistance = minimumDistance
    this.maximumDistance = maximumDistance
  }

  /**
   * Calculates the gain for a distance to the listener.
   *
   * @param distance - Distance between the voice and the listener, in world units.
   * @returns Gain from `0` to `1`.
   */
  public gainAt(distance: number): number {
    if (!Number.isFinite(distance) || distance <= this.minimumDistance) return 1
    if (distance >= this.maximumDistance) return 0

    switch (this.model) {
      case AttenuationModel.linear:
        return 1 - (distance - this.minimumDistance) / (this.maximumDistance - this.minimumDistance)
      case AttenuationModel.inverse:
        return this.minimumDistance / distance
      case AttenuationModel.exponential:
        return (this.minimumDistance / distance) ** 2
    }

    return 0
  }

  /**
   * Compares this curve with another by value.
   *
   * @param other - The curve to compare with.
   * @param tolerance - Absolute tolerance applied to the distances.
   * @returns Whether the model and both distances are equal within the tolerance.
   */
  public equals(other: Attenuation, tolerance: number = 1e-6): boolean {
    return (
      this.model === other.model &&
      Math.abs(this.minimumDistance - other.minimumDistance) <= tolerance &&
      Math.abs(this.maximumDistance - other.maximumDistance) <= tolerance
    )
  }
}
