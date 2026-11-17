import { ReactiveSet } from '#/core/collections/reactive-set.js'
import { type ReadOnlySignal, Signal } from '#/core/events/signal.js'
import { Store } from '#/core/events/store.js'
import { Node } from '#/core/node/node.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'
import { type BodyDescriptor2D } from '#/physics/descriptors/2d/body.js'
import { type JointDescriptor2D } from '#/physics/descriptors/2d/joint.js'
import { type BodyState2D } from '#/physics/descriptors/2d/state.js'
import { type BodyContact } from '#/physics/descriptors/contact.js'
import { type SimulationContext } from '#/physics/interfaces/context.js'
import { type RayHit2D, type RayQueryOptions } from '#/physics/interfaces/ray.js'
import { acceptsState2D, type Simulable2D } from '#/physics/interfaces/simulable.js'
import { Dimension } from '#/physics/primitives/dimension.js'
import { type CollectedBody2D, collectNodeBodies2D } from '#/physics/traversal.js'

import { type SimulationBackend2D, type SimulationFrame2D } from '../../backends/backend.js'
import { SimulationSpace, type SimulationSpaceOptions } from '../space.js'

/** Configuration for a two-dimensional simulation space. */
export interface SimulationSpace2DOptions extends SimulationSpaceOptions {
  /** Acceleration applied to dynamic bodies, in world units per second squared; defaults to `(0, 9.81)`. */
  readonly gravity?: Vector2
  /** Initial borrowed entries. */
  readonly entries?: Iterable<Simulable2D>
  /** Initial joints. */
  readonly joints?: Iterable<JointDescriptor2D>
}

/**
 * Steps two-dimensional bodies through a backend.
 *
 * Entries that are nodes are traversed, so every descendant that can describe
 * bodies takes part in the step. Destroyed nodes are skipped, while hidden ones
 * keep colliding.
 */
export class SimulationSpace2D extends SimulationSpace {
  private readonly _contact: Signal<[BodyContact]> = new Signal<[BodyContact]>()
  private readonly _owners: Map<string, Simulable2D> = new Map<string, Simulable2D>()
  private _backend: SimulationBackend2D | undefined

  /** @inheritDoc */
  public override readonly dimension: Dimension = Dimension.twoDimensional

  /** Acceleration applied to dynamic bodies. */
  public readonly gravity: Store<Vector2>

  /** Borrowed simulable entries. */
  public readonly entries: ReactiveSet<Simulable2D>

  /** Joints constrained by the space. */
  public readonly joints: ReactiveSet<JointDescriptor2D>

  /** Fired for every contact reported by a step. */
  public readonly onContact: ReadOnlySignal<[BodyContact]> = this._contact

  /**
   * @param options - Identifier, step settings, gravity and initial entries.
   */
  public constructor({
    gravity = new Vector2(0, 9.81),
    entries = [],
    joints = [],
    ...options
  }: SimulationSpace2DOptions) {
    super(options)
    this.gravity = new Store(gravity)
    this.entries = new ReactiveSet(entries)
    this.joints = new ReactiveSet(joints)
  }

  /**
   * Collects the bodies produced by the space entries.
   *
   * @param context - Step state offered to simulable entries.
   * @returns Gravity and bodies of the current update.
   * @throws {@link Error} If the space is destroyed or an entry fails.
   */
  public collect(context: SimulationContext): SimulationFrame2D {
    this.throwIfDestroyed()
    const collected: CollectedBody2D[] = []
    for (const entry of this.entries) {
      if (entry instanceof Node) {
        collectNodeBodies2D(entry, context, collected)
        continue
      }

      for (const descriptor of entry.simulate(context).bodies) {
        collected.push({ owner: entry, descriptor })
      }
    }

    return this.prepare(collected)
  }

  /**
   * Steps the space and applies the resolved states back to its entries.
   *
   * Elapsed time is split into fixed steps, the backend is synchronized once
   * and the outcome is applied once, so entries observe a single state per
   * update.
   *
   * @param backend - Backend that advances the bodies.
   * @param deltaTime - Elapsed time of the update, in seconds.
   * @throws {@link Error} If the space is destroyed or the backend fails.
   */
  public step(backend: SimulationBackend2D, deltaTime: number): void {
    this.throwIfDestroyed()
    this._backend = backend
    if (!this.enabled.value) return
    const steps = this.consumeSteps(deltaTime)
    if (steps.length === 0) return
    const context: SimulationContext = {
      deltaTime,
      fixedDeltaTime: this.fixedDeltaTime.value,
      step: this.steps - steps.length,
    }
    backend.sync(this.collect(context))
    for (const step of steps) backend.advance(step)
    const result = backend.read()
    this.applyStates(result.states)
    this.publishContacts(result.contacts)
  }

  /**
   * Casts a ray through the world of the backend that stepped this space.
   *
   * @param origin - Start of the ray, in world units.
   * @param direction - Direction of the ray; it is normalized before casting.
   * @param maximumDistance - Length of the ray, in world units.
   * @param options - Filtering applied to the query.
   * @returns The first hit, or undefined when the ray hits nothing.
   * @throws {@link Error} If the space was never stepped or the backend fails.
   */
  public castRay(
    origin: Vector2,
    direction: Vector2,
    maximumDistance: number,
    options?: RayQueryOptions,
  ): RayHit2D | undefined {
    this.throwIfDestroyed()
    if (this._backend === undefined) {
      throw new Error('A simulation space must be stepped before casting rays.')
    }

    return this._backend.castRay(origin, direction, maximumDistance, options)
  }

  protected override onDestroy(): void {
    this.entries.clear()
    this.joints.clear()
    this._owners.clear()
    if (!this.gravity.destroyed) this.gravity.destroy()
    if (!this._contact.destroyed) this._contact.destroy()
    super.onDestroy()
  }

  /**
   * Registers the owners of collected bodies and freezes them into a frame.
   *
   * Subclasses that collect their own bodies, such as scene spaces, call this
   * method to share the same ownership rules.
   *
   * @param collected - Bodies with the objects that produced them.
   * @returns Gravity and bodies of the current update.
   */
  protected prepare(collected: readonly CollectedBody2D[]): SimulationFrame2D {
    this._owners.clear()
    const bodies: BodyDescriptor2D[] = []
    for (const { owner, descriptor } of collected) {
      bodies.push(descriptor)
      this._owners.set(descriptor.identifier, owner)
    }

    return { gravity: this.gravity.value, bodies, joints: [...this.joints] }
  }

  private applyStates(states: readonly BodyState2D[]): void {
    for (const state of states) {
      const owner = this._owners.get(state.identifier)
      if (owner === undefined || !acceptsState2D(owner)) continue
      owner.applyState(state)
    }
  }

  private publishContacts(contacts: readonly BodyContact[]): void {
    for (const contact of contacts) this._contact.fire(contact)
  }
}
