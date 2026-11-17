import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { type MotionType } from '../../primitives/motion.js'

import { type ColliderDescriptor2D } from './collider.js'

/** Configuration for a body descriptor. */
export interface BodyDescriptor2DOptions {
  /** Stable identifier used to keep the body between steps. */
  readonly identifier: string
  /** How the body takes part in the simulation. */
  readonly motion: MotionType
  /** Position of the body origin in world units. */
  readonly position: Vector2
  /** Rotation of the body around its origin, in radians; defaults to zero. */
  readonly rotation?: number
  /** Colliders attached to the body; defaults to none. */
  readonly colliders?: Iterable<ColliderDescriptor2D>
  /** Velocity the body is pushed with, in world units per second; defaults to zero. */
  readonly linearVelocity?: Vector2
  /** Angular velocity the body is pushed with, in radians per second; defaults to zero. */
  readonly angularVelocity?: number
  /** Multiplier applied to the simulation gravity; defaults to `1`. */
  readonly gravityScale?: number
  /** Fraction of linear velocity removed each second; defaults to `0`. */
  readonly linearDamping?: number
  /** Fraction of angular velocity removed each second; defaults to `0`. */
  readonly angularDamping?: number
  /** Whether continuous collision detection is enabled; defaults to false. */
  readonly ccd?: boolean
  /** Whether the simulation may put the body to sleep; defaults to true. */
  readonly sleepAllowed?: boolean
  /**
   * Whether the simulation must adopt the descriptor transform instead of
   * integrating it. Static and kinematic bodies always adopt it. Defaults to false.
   */
  readonly teleport?: boolean
  /** Continuous force applied while the body is simulated, in newtons; defaults to zero. */
  readonly force?: Vector2
  /** Force applied once by the next step, in newton-seconds; defaults to zero. */
  readonly impulse?: Vector2
  /** Continuous torque applied while the body is simulated; defaults to zero. */
  readonly torque?: number
  /** Torque applied once by the next step; defaults to zero. */
  readonly angularImpulse?: number
}

/**
 * Describes a body and its colliders for a single simulation step.
 *
 * Descriptors are immutable values. A producer that reuses the same instance
 * while nothing changes lets backends compare by reference instead of by value.
 */
export class BodyDescriptor2D {
  /** Stable identifier used to keep the body between steps. */
  public readonly identifier: string

  /** How the body takes part in the simulation. */
  public readonly motion: MotionType

  /** Position of the body origin in world units. */
  public readonly position: Vector2

  /** Rotation of the body around its origin, in radians. */
  public readonly rotation: number

  /** Colliders attached to the body. */
  public readonly colliders: readonly ColliderDescriptor2D[]

  /** Velocity the body is pushed with, in world units per second. */
  public readonly linearVelocity: Vector2

  /** Angular velocity the body is pushed with, in radians per second. */
  public readonly angularVelocity: number

  /** Multiplier applied to the simulation gravity. */
  public readonly gravityScale: number

  /** Fraction of linear velocity removed each second. */
  public readonly linearDamping: number

  /** Fraction of angular velocity removed each second. */
  public readonly angularDamping: number

  /** Whether continuous collision detection is enabled. */
  public readonly ccd: boolean

  /** Whether the simulation may put the body to sleep. */
  public readonly sleepAllowed: boolean

  /** Whether the simulation must adopt the transform instead of integrating it. */
  public readonly teleport: boolean

  /** Continuous force applied while the body is simulated. */
  public readonly force: Vector2

  /** Force applied once by the next step. */
  public readonly impulse: Vector2

  /** Continuous torque applied while the body is simulated. */
  public readonly torque: number

  /** Torque applied once by the next step. */
  public readonly angularImpulse: number

  /**
   * @param options - Identity, motion, transform, colliders and accumulated pushes.
   */
  public constructor({
    identifier,
    motion,
    position,
    rotation = 0,
    colliders = [],
    linearVelocity = new Vector2(0, 0),
    angularVelocity = 0,
    gravityScale = 1,
    linearDamping = 0,
    angularDamping = 0,
    ccd = false,
    sleepAllowed = true,
    teleport = false,
    force = new Vector2(0, 0),
    impulse = new Vector2(0, 0),
    torque = 0,
    angularImpulse = 0,
  }: BodyDescriptor2DOptions) {
    this.identifier = identifier
    this.motion = motion
    this.position = position
    this.rotation = rotation
    this.colliders = Object.freeze([...colliders])
    this.linearVelocity = linearVelocity
    this.angularVelocity = angularVelocity
    this.gravityScale = gravityScale
    this.linearDamping = linearDamping
    this.angularDamping = angularDamping
    this.ccd = ccd
    this.sleepAllowed = sleepAllowed
    this.teleport = teleport
    this.force = force
    this.impulse = impulse
    this.torque = torque
    this.angularImpulse = angularImpulse
  }

  /**
   * Compares this body with another by value.
   *
   * @param other - The body to compare with.
   * @param tolerance - Absolute tolerance used for transforms and velocities.
   * @returns Whether both bodies describe the same state.
   */
  public equals(other: BodyDescriptor2D, tolerance: number = 1e-6): boolean {
    if (
      this.identifier !== other.identifier ||
      this.motion !== other.motion ||
      this.ccd !== other.ccd ||
      this.sleepAllowed !== other.sleepAllowed ||
      this.teleport !== other.teleport ||
      this.colliders.length !== other.colliders.length ||
      !hasEqualNumber(this.rotation, other.rotation, tolerance) ||
      !hasEqualNumber(this.angularVelocity, other.angularVelocity, tolerance) ||
      !hasEqualNumber(this.gravityScale, other.gravityScale, tolerance) ||
      !hasEqualNumber(this.linearDamping, other.linearDamping, tolerance) ||
      !hasEqualNumber(this.angularDamping, other.angularDamping, tolerance) ||
      !hasEqualNumber(this.torque, other.torque, tolerance) ||
      !hasEqualNumber(this.angularImpulse, other.angularImpulse, tolerance)
    ) {
      return false
    }

    if (
      !this.position.equals(other.position, tolerance) ||
      !this.linearVelocity.equals(other.linearVelocity, tolerance) ||
      !this.force.equals(other.force, tolerance) ||
      !this.impulse.equals(other.impulse, tolerance)
    ) {
      return false
    }

    return this.colliders.every(
      (collider, index) => other.colliders[index]?.equals(collider, tolerance) === true,
    )
  }
}

function hasEqualNumber(left: number, right: number, tolerance: number): boolean {
  return Math.abs(left - right) <= tolerance
}
