import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { type Shape2D } from '../../primitives/shape.js'
import { type PhysicsMaterial } from '../../resources/material.js'

/** Default collision layer, the first bit. */
export const defaultCollisionLayer = 0b1

/** Default collision mask, every layer. */
export const defaultCollisionMask = 0xffff

/** Configuration for a collider descriptor. */
export interface ColliderDescriptor2DOptions {
  /** Shape of the collider. */
  readonly shape: Shape2D
  /** Stable identifier used to reconcile colliders between steps; defaults to a random one. */
  readonly identifier?: string
  /** Offset applied to the shape within its body; defaults to the origin. */
  readonly offset?: Vector2
  /** Rotation of the shape within its body, in radians; defaults to zero. */
  readonly rotation?: number
  /** Surface properties, or undefined to use backend defaults. */
  readonly material?: PhysicsMaterial
  /** Whether the collider reports contacts without blocking other bodies; defaults to false. */
  readonly sensor?: boolean
  /** Collision layer this collider belongs to, as a 16-bit mask; defaults to the first bit. */
  readonly layer?: number
  /** Collision layers this collider interacts with, as a 16-bit mask; defaults to all. */
  readonly mask?: number
}

/**
 * Describes a shape attached to a body.
 *
 * Descriptors are immutable values that a backend can create, keep or remove
 * without knowing about the nodes that produced them.
 */
export class ColliderDescriptor2D {
  /** Stable identifier used to reconcile colliders between steps. */
  public readonly identifier: string

  /** Shape of the collider. */
  public readonly shape: Shape2D

  /** Offset applied to the shape within its body. */
  public readonly offset: Vector2

  /** Rotation of the shape within its body, in radians. */
  public readonly rotation: number

  /** Surface properties, or undefined to use backend defaults. */
  public readonly material: PhysicsMaterial | undefined

  /** Whether the collider reports contacts without blocking other bodies. */
  public readonly sensor: boolean

  /** Collision layer this collider belongs to. */
  public readonly layer: number

  /** Collision layers this collider interacts with. */
  public readonly mask: number

  /**
   * @param options - Shape, placement, surface and collision filtering.
   * @throws {@link RangeError} If the rotation is not finite or a layer is out of range.
   */
  public constructor({
    identifier = crypto.randomUUID(),
    shape,
    offset = new Vector2(0, 0),
    rotation = 0,
    material,
    sensor = false,
    layer = defaultCollisionLayer,
    mask = defaultCollisionMask,
  }: ColliderDescriptor2DOptions) {
    if (!Number.isFinite(rotation)) {
      throw new RangeError('Collider rotation must be finite.')
    }

    if (!isLayer(layer) || !isLayer(mask)) {
      throw new RangeError('Collider layer and mask must be 16-bit unsigned integers.')
    }

    this.identifier = identifier
    this.shape = shape
    this.offset = offset
    this.rotation = rotation
    this.material = material
    this.sensor = sensor
    this.layer = layer
    this.mask = mask
  }

  /**
   * Compares this collider with another by value.
   *
   * @param other - The collider to compare with.
   * @param tolerance - Absolute tolerance used for the offset and rotation.
   * @returns Whether both colliders describe the same geometry and filtering.
   */
  public equals(other: ColliderDescriptor2D, tolerance: number = 1e-6): boolean {
    return (
      this.identifier === other.identifier &&
      this.shape === other.shape &&
      this.material === other.material &&
      this.offset.equals(other.offset, tolerance) &&
      Math.abs(this.rotation - other.rotation) <= tolerance &&
      this.sensor === other.sensor &&
      this.layer === other.layer &&
      this.mask === other.mask
    )
  }
}

function isLayer(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff
}
