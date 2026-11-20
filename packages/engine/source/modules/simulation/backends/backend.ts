import { type Identifiable } from '#/core/interfaces/identifiable.js'
import { Destroyable } from '#/core/primitives/destroyable.js'
import { type Vector2 } from '#/math/primitives/vectors/vector2.js'
import { type BodyDescriptor2D } from '#/physics/descriptors/2d/body.js'
import { type JointDescriptor2D } from '#/physics/descriptors/2d/joint.js'
import { type BodyState2D } from '#/physics/descriptors/2d/state.js'
import { type BodyContact2D } from '#/physics/descriptors/contact.js'
import { type RayHit2D, type RayQueryOptions } from '#/physics/interfaces/ray.js'
import { type Dimension } from '#/physics/primitives/dimension.js'

/** Counters reported by a simulation backend. */
export interface SimulationStats {
  /** Number of bodies kept by the backend. */
  readonly bodies: number
  /** Number of colliders kept by the backend. */
  readonly colliders: number
  /** Number of steps executed by the backend. */
  readonly steps: number
  /** Number of contacts reported by the last step. */
  readonly contacts: number
}

/** Everything a backend needs to synchronize a two-dimensional space. */
export interface SimulationFrame2D {
  /** Acceleration applied to every dynamic body, in world units per second squared. */
  readonly gravity: Vector2
  /** Bodies to create, update or remove. */
  readonly bodies: readonly BodyDescriptor2D[]
  /** Joints to create, update or remove. */
  readonly joints: readonly JointDescriptor2D[]
}

/** The outcome of the steps executed for a two-dimensional space. */
export interface SimulationResult2D {
  /** Resolved states of the bodies the simulation moved. */
  readonly states: readonly BodyState2D[]
  /** Contacts reported during the steps, with their points. */
  readonly contacts: readonly BodyContact2D[]
}

/**
 * Executes backend-independent simulation data.
 *
 * Backends are owned by the simulation module, which synchronizes a frame,
 * advances the world one or more times and reads the outcome back. A backend
 * keeps its state between steps, so bodies are identified by the identifier of
 * the object that produced them.
 */
export abstract class SimulationBackend extends Destroyable implements Identifiable<string> {
  /** Dimensionality of the world kept by this backend. */
  public abstract readonly dimension: Dimension

  /** Unique backend identifier. */
  public readonly identifier: string

  /**
   * @param identifier - The nonempty backend identifier.
   * @throws {@link Error} If the identifier is empty.
   */
  protected constructor(identifier: string) {
    super()
    if (!identifier.trim()) {
      throw new Error('Simulation backend identifier must not be empty.')
    }

    this.identifier = identifier
  }

  /** Counters reported by the backend. */
  public abstract get stats(): SimulationStats
}

/**
 * Advances a two-dimensional world.
 *
 * The simulation module calls {@link sync} once per update, {@link advance}
 * once per fixed step and {@link read} once afterwards.
 */
export abstract class SimulationBackend2D extends SimulationBackend {
  /**
   * Creates, updates or removes the bodies described by a frame.
   *
   * Bodies missing from the frame are removed, and repeated calls with the same
   * descriptors must not restart them.
   *
   * @param frame - Gravity and bodies for the current update.
   * @throws {@link Error} If the backend is destroyed.
   */
  public abstract sync(frame: SimulationFrame2D): void

  /**
   * Advances the world by a single step.
   *
   * @param deltaTime - Length of the step, in seconds.
   * @throws {@link Error} If the backend is destroyed.
   */
  public abstract advance(deltaTime: number): void

  /**
   * Reads the outcome of the steps executed since the previous read.
   *
   * @returns Resolved body states and reported contacts.
   * @throws {@link Error} If the backend is destroyed.
   */
  public abstract read(): SimulationResult2D

  /**
   * Casts a ray through the world.
   *
   * @param origin - Start of the ray, in world units.
   * @param direction - Direction of the ray; it is normalized before casting.
   * @param maximumDistance - Length of the ray, in world units.
   * @param options - Filtering applied to the query.
   * @returns The first hit, or undefined when the ray hits nothing.
   * @throws {@link Error} If the backend is destroyed.
   */
  public abstract castRay(
    origin: Vector2,
    direction: Vector2,
    maximumDistance: number,
    options?: RayQueryOptions,
  ): RayHit2D | undefined
}
