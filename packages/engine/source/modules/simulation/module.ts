import { IdentifiableSet } from '#/core/collections/identifiable-set.js'
import { Module, type ModuleDependency, ModuleState } from '#/core/module.js'
import { Once } from '#/core/primitives/once.js'

import { type UpdateContext } from '../time/context.js'
import { type Updatable } from '../time/interfaces/updatable.js'

import { type SimulationBackend } from './backends/backend.js'
import { type SimulationSpace } from './spaces/space.js'

/** A space together with the backend that advances it. */
export interface SimulationSpaceBinding {
  /** Space whose ownership transfers to the module. */
  readonly space: SimulationSpace
  /** Backend that advances that space; its ownership transfers to the module. */
  readonly backend: SimulationBackend
}

/** Configuration for the simulation module. */
export interface SimulationModuleOptions {
  /** Spaces bound to the backend that advances each one. */
  readonly spaces?: Iterable<SimulationSpaceBinding>
  /** Required and optional module dependencies. */
  readonly dependencies?: Iterable<ModuleDependency>
}

/**
 * Steps registered spaces through the backend each one runs in.
 *
 * Every space owns its own world, so two spaces of the same dimensionality
 * never see each other's bodies. Each update steps the spaces in priority order.
 */
export class SimulationModule extends Module implements Updatable {
  private readonly _preparation: Once = new Once(
    'Simulation module preparation has already failed or is in progress.',
  )

  private readonly _backends: IdentifiableSet<SimulationBackend> =
    new IdentifiableSet<SimulationBackend>()

  private readonly _spaces: IdentifiableSet<SimulationSpace> =
    new IdentifiableSet<SimulationSpace>()

  private readonly _runtime: Map<string, SimulationBackend> = new Map<string, SimulationBackend>()

  /**
   * @param options - Initial spaces bound to their backends.
   * @throws {@link Error} If identifiers are duplicated.
   */
  public constructor({ spaces = [], dependencies = [] }: SimulationModuleOptions = {}) {
    super({ identifier: 'org.js.euphoria.SimulationModule', dependencies })
    for (const binding of spaces) this.bind(binding)
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
   * Registers a space bound to its backend, transferring both.
   *
   * @param binding - Space and the backend that advances it.
   * @throws {@link Error} If the space or the backend is destroyed or their identifiers are duplicated.
   */
  public addSpace({ space, backend }: SimulationSpaceBinding): void {
    this.throwIfDestroyed()
    this.bind({ space, backend })
  }

  /**
   * Finds the backend that advances a space.
   *
   * @param identifier - Identifier of the space.
   * @returns The backend bound to it, or undefined when the space is not registered.
   */
  public backendOf(identifier: string): SimulationBackend | undefined {
    return this._runtime.get(identifier)
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
    this._runtime.delete(identifier)
    return space
  }

  /**
   * Steps every enabled space in priority order.
   *
   * @param deltaTime - Elapsed time of the update, in seconds.
   * @throws {@link Error} If a space lost its backend.
   */
  public step(deltaTime: number): void {
    this.throwIfDestroyed()
    const spaces = [...this._spaces].sort((left, right) => left.priority - right.priority)
    for (const space of spaces) {
      if (!space.enabled.value) continue
      const backend = this._runtime.get(space.identifier)
      if (backend === undefined) {
        throw new Error(`Simulation space '${space.identifier}' has no backend bound to it.`)
      }

      space.step(backend, deltaTime)
    }
  }

  /** @inheritDoc */
  public update(context: UpdateContext): void {
    this.step(context.deltaTime)
  }

  /** Yields additional spaces bound to their backends, once. */
  protected *compose(): Generator<SimulationSpaceBinding, void, unknown> {
    // Override to yield spaces.
  }

  /** Configures the module once after composition. */
  protected configure(): void {
    // Override to configure the module.
  }

  protected override onStart(): void {
    this._preparation.execute(() => {
      for (const binding of this.compose()) this.bind(binding)
      this.configure()
    })
  }

  protected override onDestroy(): void {
    if (!this.state.destroyed && this.state.value !== ModuleState.idle) {
      throw new Error(`Module '${this.identifier}' cannot be destroyed while not idle.`)
    }

    for (const space of [...this._spaces]) {
      if (!space.destroyed) space.destroy()
    }

    this._spaces.clear()
    this._runtime.clear()
    for (const backend of [...this._backends]) {
      if (!backend.destroyed) backend.destroy()
    }

    this._backends.clear()
    super.onDestroy()
  }

  private bind({ space, backend }: SimulationSpaceBinding): void {
    this._spaces.add(space)
    if (!this._backends.get(backend.identifier)) this._backends.add(backend)
    this._runtime.set(space.identifier, backend)
  }
}
