import { Vector3 } from '#/math/primitives/vectors/vector3.js'

import { type MotionType } from '../../primitives/motion.js'

import { type ColliderDescriptor3D } from './collider.js'

/** Configuration for a body descriptor in space. */
export interface BodyDescriptor3DOptions {
  /** Stable identifier used to keep the body between steps. */
  readonly identifier: string
  /** How the body takes part in the simulation. */
  readonly motion: MotionType
  /** Position of the body origin in world units. */
  readonly position: Vector3
  /** Rotation of the body as roll, pitch and yaw, in radians; defaults to zero. */
  readonly rotation?: Vector3
  /** Colliders attached to the body; defaults to none. */
  readonly colliders?: Iterable<ColliderDescriptor3D>
  /** Velocity the body is pushed with, in world units per second; defaults to zero. */
  readonly linearVelocity?: Vector3
  /** Angular velocity the body is pushed with, in radians per second; defaults to zero. */
  readonly angularVelocity?: Vector3
  /** Total mass of the body in kilograms, overriding the one derived from collider densities; defaults to `0`, which derives it. */
  readonly mass?: number
  /** Principal angular inertia, overriding the derived one; needs `mass`; defaults to zero, which derives it. */
  readonly inertia?: Vector3
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
  readonly force?: Vector3
  /** Force applied once by the next step, in newton-seconds; defaults to zero. */
  readonly impulse?: Vector3
  /** Continuous torque applied while the body is simulated, in newton-metres; defaults to zero. */
  readonly torque?: Vector3
  /** Torque applied once by the next step, in newton-metre-seconds; defaults to zero. */
  readonly angularImpulse?: Vector3
}

/**
 * Describes a body and its colliders for a single simulation step in space.
 *
 * Descriptors are immutable values. A producer that reuses the same instance
 * while nothing changes lets backends compare by reference instead of by value.
 */
export class BodyDescriptor3D {
  /** Stable identifier used to keep the body between steps. */
  public readonly identifier: string

  /** How the body takes part in the simulation. */
  public readonly motion: MotionType

  /** Position of the body origin in world units. */
  public readonly position: Vector3

  /** Rotation of the body as roll, pitch and yaw, in radians. */
  public readonly rotation: Vector3

  /** Colliders attached to the body. */
  public readonly colliders: readonly ColliderDescriptor3D[]

  /** Velocity the body is pushed with, in world units per second. */
  public readonly linearVelocity: Vector3

  /** Angular velocity the body is pushed with, in radians per second. */
  public readonly angularVelocity: Vector3

  /** Total mass of the body, or `0` when it derives from the collider densities. */
  public readonly mass: number

  /** Principal angular inertia of the body, or zero when it derives from the collider shapes. */
  public readonly inertia: Vector3

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
  public readonly force: Vector3

  /** Force applied once by the next step. */
  public readonly impulse: Vector3

  /** Continuous torque applied while the body is simulated. */
  public readonly torque: Vector3

  /** Torque applied once by the next step. */
  public readonly angularImpulse: Vector3

  /**
   * @param options - Identity, motion, transform, colliders and accumulated pushes.
   */
  public constructor({
    identifier,
    motion,
    position,
    rotation = new Vector3(0, 0, 0),
    colliders = [],
    linearVelocity = new Vector3(0, 0, 0),
    angularVelocity = new Vector3(0, 0, 0),
    mass = 0,
    inertia = new Vector3(0, 0, 0),
    gravityScale = 1,
    linearDamping = 0,
    angularDamping = 0,
    ccd = false,
    sleepAllowed = true,
    teleport = false,
    force = new Vector3(0, 0, 0),
    impulse = new Vector3(0, 0, 0),
    torque = new Vector3(0, 0, 0),
    angularImpulse = new Vector3(0, 0, 0),
  }: BodyDescriptor3DOptions) {
    if (!Number.isFinite(mass) || mass < 0) {
      throw new RangeError('Body mass must be finite and not negative.')
    }

    this.identifier = identifier
    this.motion = motion
    this.position = position
    this.rotation = rotation
    this.colliders = Object.freeze([...colliders])
    this.linearVelocity = linearVelocity
    this.angularVelocity = angularVelocity
    this.mass = mass
    this.inertia = inertia
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
  public equals(other: BodyDescriptor3D, tolerance: number = 1e-6): boolean {
    if (
      this.identifier !== other.identifier ||
      this.motion !== other.motion ||
      this.ccd !== other.ccd ||
      this.sleepAllowed !== other.sleepAllowed ||
      this.teleport !== other.teleport ||
      this.colliders.length !== other.colliders.length ||
      !hasEqualNumber(this.mass, other.mass, tolerance) ||
      !this.inertia.equals(other.inertia, tolerance) ||
      !hasEqualNumber(this.gravityScale, other.gravityScale, tolerance) ||
      !hasEqualNumber(this.linearDamping, other.linearDamping, tolerance) ||
      !hasEqualNumber(this.angularDamping, other.angularDamping, tolerance)
    ) {
      return false
    }

    if (
      !this.position.equals(other.position, tolerance) ||
      !this.rotation.equals(other.rotation, tolerance) ||
      !this.linearVelocity.equals(other.linearVelocity, tolerance) ||
      !this.angularVelocity.equals(other.angularVelocity, tolerance) ||
      !this.force.equals(other.force, tolerance) ||
      !this.impulse.equals(other.impulse, tolerance) ||
      !this.torque.equals(other.torque, tolerance) ||
      !this.angularImpulse.equals(other.angularImpulse, tolerance)
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
