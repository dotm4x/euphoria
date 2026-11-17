import { ReactiveSet } from '#/core/collections/reactive-set.js'
import { Store } from '#/core/events/store.js'
import { type Node } from '#/core/node/node.js'
import { Node3D, type Node3DOptions } from '#/math/nodes/node3d.js'
import { Vector3 } from '#/math/primitives/vectors/vector3.js'

import { SimulationData3D } from '../../data.js'
import { BodyDescriptor3D } from '../../descriptors/3d/body.js'
import { type ColliderDescriptor3D } from '../../descriptors/3d/collider.js'
import { type BodyState3D } from '../../descriptors/3d/state.js'
import { type SimulationContext } from '../../interfaces/context.js'
import { type Simulable3D } from '../../interfaces/simulable.js'
import { MotionType } from '../../primitives/motion.js'

/** Configuration for a physics body in space. */
export interface PhysicsBody3DOptions extends Node3DOptions {
  /** How the body takes part in the simulation; defaults to dynamic. */
  readonly motion?: MotionType
  /** Initial colliders. */
  readonly colliders?: Iterable<ColliderDescriptor3D>
  /** Linear velocity, in world units per second; defaults to zero. */
  readonly linearVelocity?: Vector3
  /** Angular velocity, in radians per second; defaults to zero. */
  readonly angularVelocity?: Vector3
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
}

/**
 * A node that takes part in a three-dimensional simulation.
 *
 * The body describes its shapes and accumulated pushes as backend-independent
 * descriptors, and adopts the transform resolved by the simulation. Dynamic
 * bodies are moved by the simulation; static and kinematic bodies are moved by
 * their owner and push dynamic ones.
 *
 * Physics runs in world space, so a body must not be inside another
 * {@link Node3D}; give it visual children instead, which inherit its transform.
 */
export class PhysicsBody3D extends Node3D implements Simulable3D {
  private _cachedDescriptor: BodyDescriptor3D | undefined
  private _force: Vector3 = new Vector3(0, 0, 0)
  private _impulse: Vector3 = new Vector3(0, 0, 0)
  private _torque: Vector3 = new Vector3(0, 0, 0)
  private _angularImpulse: Vector3 = new Vector3(0, 0, 0)
  private _teleportPending: boolean = false

  /** How the body takes part in the simulation. */
  public readonly motion: Store<MotionType>

  /** Colliders attached to the body. */
  public readonly colliders: ReactiveSet<ColliderDescriptor3D>

  /** Linear velocity, in world units per second. */
  public readonly linearVelocity: Store<Vector3>

  /** Angular velocity, in radians per second. */
  public readonly angularVelocity: Store<Vector3>

  /** Multiplier applied to the simulation gravity. */
  public readonly gravityScale: Store<number>

  /** Fraction of linear velocity removed each second. */
  public readonly linearDamping: Store<number>

  /** Fraction of angular velocity removed each second. */
  public readonly angularDamping: Store<number>

  /** Whether continuous collision detection is enabled. */
  public readonly ccd: Store<boolean>

  /** Whether the simulation may put the body to sleep. */
  public readonly sleepAllowed: Store<boolean>

  /** Whether the simulation put the body to sleep. */
  public readonly sleeping: Store<boolean>

  /**
   * @param options - Transformation, motion, colliders and integration settings.
   */
  public constructor({
    motion = MotionType.dynamic,
    colliders = [],
    linearVelocity = new Vector3(0, 0, 0),
    angularVelocity = new Vector3(0, 0, 0),
    gravityScale = 1,
    linearDamping = 0,
    angularDamping = 0,
    ccd = false,
    sleepAllowed = true,
    name = 'PhysicsBody3D',
    ...options
  }: PhysicsBody3DOptions = {}) {
    super({ ...options, name })
    this.motion = new Store(motion)
    this.colliders = new ReactiveSet(colliders)
    this.linearVelocity = new Store(linearVelocity)
    this.angularVelocity = new Store(angularVelocity)
    this.gravityScale = new Store(gravityScale)
    this.linearDamping = new Store(linearDamping)
    this.angularDamping = new Store(angularDamping)
    this.ccd = new Store(ccd)
    this.sleepAllowed = new Store(sleepAllowed)
    this.sleeping = new Store(false)
  }

  /** @inheritDoc */
  public simulate(_context: SimulationContext): SimulationData3D {
    this.throwIfDestroyed()
    const candidate = new BodyDescriptor3D({
      identifier: this.identifier,
      motion: this.motion.value,
      position: this.position.value,
      rotation: this.rotation.value,
      colliders: [...this.colliders],
      linearVelocity: this.linearVelocity.value,
      angularVelocity: this.angularVelocity.value,
      gravityScale: this.gravityScale.value,
      linearDamping: this.linearDamping.value,
      angularDamping: this.angularDamping.value,
      ccd: this.ccd.value,
      sleepAllowed: this.sleepAllowed.value,
      teleport: this.motion.value === MotionType.static || this._teleportPending,
      force: this._force,
      impulse: this._impulse,
      torque: this._torque,
      angularImpulse: this._angularImpulse,
    })

    const descriptor =
      this._cachedDescriptor?.equals(candidate) === true ? this._cachedDescriptor : candidate
    this._cachedDescriptor = descriptor
    this.releasePushes()

    return new SimulationData3D([descriptor])
  }

  /** @inheritDoc */
  public applyState(state: BodyState3D): void {
    if (this.destroyed) return
    this.sleeping.value = state.sleeping
    if (this.motion.value !== MotionType.dynamic) return
    this.position.value = state.position
    this.rotation.value = state.rotation
    this.linearVelocity.value = state.linearVelocity
    this.angularVelocity.value = state.angularVelocity
  }

  /**
   * Applies a force to the body while it is simulated.
   *
   * @param vector - Force in newtons.
   */
  public applyForce(vector: Vector3): void {
    this._force = this._force.add(vector)
  }

  /**
   * Applies an impulse to the body during the next step.
   *
   * @param vector - Impulse in newton-seconds.
   */
  public applyImpulse(vector: Vector3): void {
    this._impulse = this._impulse.add(vector)
  }

  /**
   * Applies a torque to the body while it is simulated.
   *
   * @param vector - Torque in newton-metres.
   */
  public applyTorque(vector: Vector3): void {
    this._torque = this._torque.add(vector)
  }

  /**
   * Applies an angular impulse to the body during the next step.
   *
   * @param vector - Angular impulse in newton-metre-seconds.
   */
  public applyAngularImpulse(vector: Vector3): void {
    this._angularImpulse = this._angularImpulse.add(vector)
  }

  /**
   * Moves the body to a transform that the simulation must adopt.
   *
   * @param position - New position, or undefined to keep the current one.
   * @param rotation - New rotation as roll, pitch and yaw, or undefined to keep the current one.
   */
  public teleport(position?: Vector3, rotation?: Vector3): void {
    this.throwIfDestroyed()
    if (position !== undefined) this.position.value = position
    if (rotation !== undefined) this.rotation.value = rotation
    this._teleportPending = true
  }

  protected override onDestroy(): void {
    super.onDestroy()
    this.colliders.clear()
    const stores = [
      this.motion,
      this.linearVelocity,
      this.angularVelocity,
      this.gravityScale,
      this.linearDamping,
      this.angularDamping,
      this.ccd,
      this.sleepAllowed,
      this.sleeping,
    ]
    for (const store of stores) {
      if (!store.destroyed) store.destroy()
    }
  }

  /** @inheritDoc */
  protected override onLoad(): void {
    super.onLoad()
    for (let ancestor: Node | undefined = this.parent; ancestor !== undefined;) {
      if (ancestor instanceof Node3D) {
        throw new Error(
          'A physics body must not be inside a Node3D; physics runs in world space. Add visual children to the body instead.',
        )
      }

      ancestor = ancestor.parent
    }
  }

  private releasePushes(): void {
    this._force = new Vector3(0, 0, 0)
    this._impulse = new Vector3(0, 0, 0)
    this._torque = new Vector3(0, 0, 0)
    this._angularImpulse = new Vector3(0, 0, 0)
    this._teleportPending = false
  }
}
