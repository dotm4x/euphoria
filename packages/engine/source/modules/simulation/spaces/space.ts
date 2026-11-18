import { Store } from '#/core/events/store.js'
import { type Identifiable } from '#/core/interfaces/identifiable.js'
import { Destroyable } from '#/core/primitives/destroyable.js'
import { type Dimension } from '#/physics/primitives/dimension.js'

import { type SimulationBackend } from '../backends/backend.js'

/** Step priority of a space. Lower priorities are stepped first. */
export enum SimulationPriority {
  low,
  normal,
  high,
  critical,
}

/** Configuration shared by simulation spaces. */
export interface SimulationSpaceOptions {
  /** Unique space identifier. */
  readonly identifier: string
  /** Step priority. Defaults to normal. */
  readonly priority?: SimulationPriority
  /** Length of an individual step, in seconds. Defaults to `1 / 60`. */
  readonly fixedDeltaTime?: number
  /** Maximum steps per update; extra elapsed time is dropped. Defaults to `4`. */
  readonly maxSubSteps?: number
  /** Whether the space steps. Defaults to true. */
  readonly enabled?: boolean
}

/**
 * Groups simulable objects and steps them through a backend.
 *
 * The space converts the elapsed time of an update into fixed steps, so the
 * simulation keeps a stable rate regardless of the frame time. Entries are
 * borrowed and evaluated in registration order, and the space does not depend
 * on a specific backend.
 */
export abstract class SimulationSpace extends Destroyable implements Identifiable<string> {
  private _accumulator: number = 0
  private _steps: number = 0

  /** Dimensionality of the bodies this space collects. */
  public abstract readonly dimension: Dimension

  /** Unique space identifier. */
  public readonly identifier: string

  /** Step priority. */
  public readonly priority: SimulationPriority

  /** Length of an individual step, in seconds. */
  public readonly fixedDeltaTime: Store<number>

  /** Maximum steps per update. */
  public readonly maxSubSteps: Store<number>

  /** Whether the space steps. */
  public readonly enabled: Store<boolean>

  /**
   * @param options - Identifier, priority and fixed step settings.
   * @throws {@link Error} If the identifier is empty.
   * @throws {@link RangeError} If the step settings are invalid.
   */
  protected constructor({
    identifier,
    priority = SimulationPriority.normal,
    fixedDeltaTime = 1 / 60,
    maxSubSteps = 4,
    enabled = true,
  }: SimulationSpaceOptions) {
    super()
    if (!identifier.trim()) {
      throw new Error('Simulation space identifier must not be empty.')
    }

    if (!Number.isFinite(fixedDeltaTime) || fixedDeltaTime < 0) {
      throw new RangeError('Simulation space fixed delta time must be finite and non-negative.')
    }

    if (!Number.isInteger(maxSubSteps) || maxSubSteps < 1) {
      throw new RangeError('Simulation space maximum sub steps must be a positive integer.')
    }

    this.identifier = identifier
    this.priority = priority
    this.fixedDeltaTime = new Store(fixedDeltaTime)
    this.maxSubSteps = new Store(maxSubSteps)
    this.enabled = new Store(enabled)
  }

  /** Number of steps the space handed to its backend. */
  public get steps(): number {
    return this._steps
  }

  /**
   * Converts elapsed time into the steps to execute.
   *
   * A zero fixed delta time executes a single variable step, and elapsed time
   * beyond the maximum is dropped instead of accumulated.
   *
   * @param deltaTime - Elapsed time of the update, in seconds.
   * @returns The length of each step to execute, in seconds.
   */

  /**
   * Advances the space with the backend bound to it.
   *
   * Subclasses narrow the backend to their dimensionality, which the module
   * guarantees when it binds them.
   *
   * @param backend - Backend that advances this space.
   * @param deltaTime - Elapsed time of the update, in seconds.
   */
  public abstract step(backend: SimulationBackend, deltaTime: number): void

  protected consumeSteps(deltaTime: number): readonly number[] {
    this.throwIfDestroyed()
    if (deltaTime <= 0) return []

    const fixed = this.fixedDeltaTime.value
    if (fixed <= 0) {
      this._accumulator = 0
      this._steps++
      return [deltaTime]
    }

    this._accumulator += deltaTime
    const maximum = this.maxSubSteps.value
    const steps: number[] = []
    while (this._accumulator >= fixed && steps.length < maximum) {
      this._accumulator -= fixed
      steps.push(fixed)
    }

    if (steps.length === maximum && this._accumulator >= fixed) {
      this._accumulator %= fixed
    }

    this._steps += steps.length
    return steps
  }

  protected override onDestroy(): void {
    for (const store of [this.fixedDeltaTime, this.maxSubSteps, this.enabled]) {
      if (!store.destroyed) store.destroy()
    }

    super.onDestroy()
  }
}
