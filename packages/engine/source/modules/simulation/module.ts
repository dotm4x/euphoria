import { IdentifiableSet } from '#/core/collections/identifiable-set.js'
import { Module, ModuleState } from '#/core/module.js'
import { type Dimension } from '#/physics/primitives/dimension.js'

import { type UpdateContext } from '../time/context.js'
import { type Updatable } from '../time/interfaces/updatable.js'

import {
  type SimulationBackend,
  SimulationBackend2D,
  SimulationBackend3D,
} from './backends/backend.js'
import { SimulationSpace2D } from './spaces/2d/space.js'
import { SimulationSpace3D } from './spaces/3d/space.js'
import { type SimulationSpace } from './spaces/space.js'

/** Configuration for the simulation module. */
export interface SimulationModuleOptions {
  /** Backends whose ownership transfers to the module. */
  readonly backends?: Iterable<SimulationBackend>
  /** Spaces whose ownership transfers to the module. */
  readonly spaces?: Iterable<SimulationSpace>
}

/**
 * Steps registered spaces through their simulation backends.
 *
 * The module owns its backends and spaces. Each update steps the spaces in
 * priority order, routing every space to the backend that matches its
 * dimensionality.
 */
export class SimulationModule extends Module implements Updatable {
  private readonly _backends: IdentifiableSet<SimulationBackend> =
    new IdentifiableSet<SimulationBackend>()

  private readonly _spaces: IdentifiableSet<SimulationSpace> =
    new IdentifiableSet<SimulationSpace>()

  /**
   * @param options - Initial backends and spaces.
   * @throws {@link Error} If identifiers are duplicated.
   */
  public constructor({ backends = [], spaces = [] }: SimulationModuleOptions = {}) {
    super({ identifier: 'org.js.euphoria.SimulationModule' })
    for (const backend of backends) this._backends.add(backend)
    for (const space of spaces) this._spaces.add(space)
  }

  /** Backends indexed by identifier. The module retains ownership. */
  public get backends(): ReadonlyMap<string, SimulationBackend> {
    const backends = new Map<string, SimulationBackend>()
    for (const backend of this._backends) backends.set(backend.identifier, backend)
    return backends
  }

  /** Spaces indexed by identifier. The module retains ownership. */
  public get spaces(): ReadonlyMap<string, SimulationSpace> {
    const spaces = new Map<string, SimulationSpace>()
    for (const space of this._spaces) spaces.set(space.identifier, space)
    return spaces
  }

  /**
   * Registers a backend, transferring its ownership to the module.
   *
   * @param backend - Backend to register.
   * @throws {@link Error} If the backend is destroyed or its identifier is duplicated.
   */
  public addBackend(backend: SimulationBackend): void {
    this.throwIfDestroyed()
    this._backends.add(backend)
  }

  /**
   * Registers a space, transferring its ownership to the module.
   *
   * @param space - Space to register.
   * @throws {@link Error} If the space is destroyed or its identifier is duplicated.
   */
  public addSpace(space: SimulationSpace): void {
    this.throwIfDestroyed()
    this._spaces.add(space)
  }

  /**
   * Finds the backend that advances a dimension.
   *
   * @param dimension - Dimensionality to advance.
   * @returns The matching backend, or undefined when none is registered.
   */
  public backendFor(dimension: Dimension): SimulationBackend | undefined {
    for (const backend of this._backends) {
      if (backend.dimension === dimension) return backend
    }

    return undefined
  }

  /**
   * Removes a backend and returns its ownership to the caller.
   *
   * @param identifier - Identifier of the backend to remove.
   * @returns The removed backend, or undefined when it is not registered.
   */
  public removeBackend(identifier: string): SimulationBackend | undefined {
    this.throwIfDestroyed()
    const backend = this._backends.get(identifier)
    if (backend === undefined) return undefined
    this._backends.delete(backend)
    return backend
  }

  /**
   * Removes a space and returns its ownership to the caller.
   *
   * @param identifier - Identifier of the space to remove.
   * @returns The removed space, or undefined when it is not registered.
   */
  public removeSpace(identifier: string): SimulationSpace | undefined {
    this.throwIfDestroyed()
    const space = this._spaces.get(identifier)
    if (space === undefined) return undefined
    this._spaces.delete(space)
    return space
  }

  /**
   * Steps every enabled space in priority order.
   *
   * @param deltaTime - Elapsed time of the update, in seconds.
   * @throws {@link Error} If a space has no matching backend.
   */
  public step(deltaTime: number): void {
    this.throwIfDestroyed()
    const spaces = [...this._spaces].sort((left, right) => left.priority - right.priority)
    for (const space of spaces) {
      if (!space.enabled.value) continue
      const backend = this.backendFor(space.dimension)
      if (backend === undefined) {
        throw new Error(`No simulation backend is registered for dimension '${space.dimension}'.`)
      }

      if (space instanceof SimulationSpace2D && backend instanceof SimulationBackend2D) {
        space.step(backend, deltaTime)
        continue
      }

      if (space instanceof SimulationSpace3D && backend instanceof SimulationBackend3D) {
        space.step(backend, deltaTime)
        continue
      }

      throw new Error(
        `Simulation space '${space.identifier}' cannot be stepped by backend '${backend.identifier}'.`,
      )
    }
  }

  /** @inheritDoc */
  public update(context: UpdateContext): void {
    this.step(context.deltaTime)
  }

  protected override onDestroy(): void {
    if (!this.state.destroyed && this.state.value !== ModuleState.idle) {
      throw new Error(`Module '${this.identifier}' cannot be destroyed while not idle.`)
    }

    for (const space of [...this._spaces]) {
      if (!space.destroyed) space.destroy()
    }

    this._spaces.clear()
    for (const backend of [...this._backends]) {
      if (!backend.destroyed) backend.destroy()
    }

    this._backends.clear()
    super.onDestroy()
  }
}
