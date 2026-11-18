import { ReactiveSet } from '#/core/collections/reactive-set.js'
import { type ReadOnlySignal, Signal } from '#/core/events/signal.js'
import { type ReadOnlyStore } from '#/core/events/store.js'
import { Store } from '#/core/events/store.js'
import { type Node } from '#/core/node/node.js'
import { Node2D, type Node2DOptions } from '#/math/nodes/node2d.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { SimulationData2D } from '../../data.js'
import { BodyDescriptor2D } from '../../descriptors/2d/body.js'
import { type ColliderDescriptor2D } from '../../descriptors/2d/collider.js'
import { type BodyState2D } from '../../descriptors/2d/state.js'
import { type SimulationContext } from '../../interfaces/context.js'
import { type Simulable2D, type SimulableContact2D } from '../../interfaces/simulable.js'
import { MotionType } from '../../primitives/motion.js'

/** Configuration for a physics body. */
export interface PhysicsBody2DOptions extends Node2DOptions {
  /** How the body takes part in the simulation; defaults to dynamic. */
  readonly motion?: MotionType
  /** Initial colliders. */
  readonly colliders?: Iterable<ColliderDescriptor2D>
  /** General velocity, in world units per second; defaults to zero. */
  readonly linearVelocity?: Vector2
  /** Angular velocity, in radians per second; defaults to zero. */
  readonly angularVelocity?: number
  /** Total mass in kilograms; defaults to `0`, which derives it from the collider densities. */
  readonly mass?: number
  /** Angular inertia around the origin; needs mass; defaults to `0`, which derives it from the shapes. */
  readonly inertia?: number
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
 * A node that takes part in a two-dimensional simulation.
 *
 * The body describes its shapes and accumulated pushes as backend-independent
 * descriptors, and adopts the transform resolved by the simulation. Dynamic
 * bodies are moved by the simulation; static and kinematic bodies are moved by
 * their owner and push dynamic ones.
 *
 * Physics runs in world space, so a body must not be inside another
 * {@link Node2D}; give it visual children instead, which inherit its transform.
 */
export class PhysicsBody2D extends Node2D implements Simulable2D {
  private _cachedDescriptor: BodyDescriptor2D | undefined
  private _force: Vector2 = new Vector2(0, 0)
  private _impulse: Vector2 = new Vector2(0, 0)
  private _torque: number = 0
  private _angularImpulse: number = 0

  private readonly _contact: Signal<[SimulableContact2D]> = new Signal<[SimulableContact2D]>()
  private readonly _touching: Store<readonly SimulableContact2D[]> = new Store<
    readonly SimulableContact2D[]
  >([])

  private _teleportPending: boolean = false

  /** How the body takes part in the simulation. */
  public readonly motion: Store<MotionType>

  /** Colliders attached to the body. */
  public readonly colliders: ReactiveSet<ColliderDescriptor2D>

  /** Linear velocity, in world units per second. */
  public readonly linearVelocity: Store<Vector2>

  /** Angular velocity, in radians per second. */
  public readonly angularVelocity: Store<number>

  /** Total mass in kilograms, or `0` when it derives from the collider densities. */
  public readonly mass: Store<number>

  /** Angular inertia, or `0` when it derives from the collider shapes. */
  public readonly inertia: Store<number>

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

  /** Fired for every contact of this body, resolved to the objects that own it. */
  public readonly onContact: ReadOnlySignal<[SimulableContact2D]> = this._contact

  /** Contacts that still overlap after the last step, with their points. */
  public readonly touching: ReadOnlyStore<readonly SimulableContact2D[]> = this._touching

  /**
   * @param options - Transformation, motion, colliders and integration settings.
   */
  public constructor({
    motion = MotionType.dynamic,
    colliders = [],
    linearVelocity = new Vector2(0, 0),
    angularVelocity = 0,
    mass = 0,
    inertia = 0,
    gravityScale = 1,
    linearDamping = 0,
    angularDamping = 0,
    ccd = false,
    sleepAllowed = true,
    name = 'PhysicsBody2D',
    ...options
  }: PhysicsBody2DOptions = {}) {
    super({ ...options, name })
    this.motion = new Store(motion)
    this.colliders = new ReactiveSet(colliders)
    this.linearVelocity = new Store(linearVelocity)
    this.angularVelocity = new Store(angularVelocity)
    this.mass = new Store(mass)
    this.inertia = new Store(inertia)
    this.gravityScale = new Store(gravityScale)
    this.linearDamping = new Store(linearDamping)
    this.angularDamping = new Store(angularDamping)
    this.ccd = new Store(ccd)
    this.sleepAllowed = new Store(sleepAllowed)
    this.sleeping = new Store(false)
  }

  /** @inheritDoc */
  public simulate(_context: SimulationContext): SimulationData2D {
    this.throwIfDestroyed()
    const candidate = new BodyDescriptor2D({
      identifier: this.identifier,
      motion: this.motion.value,
      position: this.position.value,
      rotation: this.rotation.value,
      colliders: [...this.colliders],
      linearVelocity: this.linearVelocity.value,
      angularVelocity: this.angularVelocity.value,
      mass: this.mass.value,
      inertia: this.inertia.value,
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

    return new SimulationData2D([descriptor])
  }

  /** @inheritDoc */
  public applyState(state: BodyState2D): void {
    if (this.destroyed) return
    this.sleeping.value = state.sleeping
    if (this.motion.value !== MotionType.dynamic) return
    this.position.value = state.position
    this.rotation.value = state.rotation
    this.linearVelocity.value = state.linearVelocity
    this.angularVelocity.value = state.angularVelocity
  }

  /**
   * Fires the contact signal of this body.
   *
   * The simulation space calls it for every contact of the bodies this node
   * produced, after resolving both sides to their objects.
   *
   * @param contact - The resolved contact.
   */
  public notifyContact(contact: SimulableContact2D): void {
    if (this.destroyed) return
    this._contact.fire(contact)
  }

  /**
   * Replaces the contacts that still overlap after a step.
   *
   * @param contacts - Contacts that remain touching, with their points.
   */
  public notifyTouching(contacts: readonly SimulableContact2D[]): void {
    if (this.destroyed) return
    this._touching.value = contacts
  }

  /**
   * Whether the body still overlaps another shape after the last step.
   *
   * @returns Whether any contact of this body remains touching.
   */
  public isTouching(): boolean {
    return this._touching.value.length > 0
  }

  /**
   * Applies a force to the body while it is simulated.
   *
   * @param vector - Force in newtons.
   */
  public applyForce(vector: Vector2): void {
    this._force = this._force.add(vector)
  }

  /**
   * Applies an impulse to the body during the next step.
   *
   * @param vector - Impulse in newton-seconds.
   */
  public applyImpulse(vector: Vector2): void {
    this._impulse = this._impulse.add(vector)
  }

  /**
   * Applies a torque to the body while it is simulated.
   *
   * @param value - Torque in newton-metres.
   */
  public applyTorque(value: number): void {
    this._torque += value
  }

  /**
   * Applies an angular impulse to the body during the next step.
   *
   * @param value - Angular impulse in newton-metre-seconds.
   */
  public applyAngularImpulse(value: number): void {
    this._angularImpulse += value
  }

  /**
   * Moves the body to a transform that the simulation must adopt.
   *
   * @param position - New position, or undefined to keep the current one.
   * @param rotation - New rotation in radians, or undefined to keep the current one.
   */
  public teleport(position?: Vector2, rotation?: number): void {
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
      this.mass,
      this.inertia,
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

    if (!this._contact.destroyed) this._contact.destroy()
    if (!this._touching.destroyed) this._touching.destroy()
  }

  /** @inheritDoc */
  protected override onLoad(): void {
    super.onLoad()
    for (let ancestor: Node | undefined = this.parent; ancestor !== undefined;) {
      if (ancestor instanceof Node2D) {
        throw new Error(
          'A physics body must not be inside a Node2D; physics runs in world space. Add visual children to the body instead.',
        )
      }

      ancestor = ancestor.parent
    }
  }

  private releasePushes(): void {
    this._force = new Vector2(0, 0)
    this._impulse = new Vector2(0, 0)
    this._torque = 0
    this._angularImpulse = 0
    this._teleportPending = false
  }
}
