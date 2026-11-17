import { type EventConnection } from '#/core/events/event.js'
import { Store } from '#/core/events/store.js'
import { Node3D, type Node3DOptions } from '#/math/nodes/node3d.js'
import { type Vector3 } from '#/math/primitives/vectors/vector3.js'

import { Color } from '../primitives/color.js'
import { type Light, type LightEnvironment, LightKind } from '../resources/light-environment.js'

import { resolveEnvironment } from './environment.js'

/** Configuration shared by three-dimensional lights. */
export interface Light3DOptions extends Node3DOptions {
  /** Color and intensity of the light. Defaults to white. */
  readonly color?: Color
  /** Multiplier applied to the color. Defaults to one. */
  readonly energy?: number
}

interface LightRegistration {
  readonly environment: LightEnvironment
  readonly slot: number | undefined
}

/**
 * Base class of the three-dimensional lights.
 *
 * A light does not draw: while it is loaded it registers itself in the nearest
 * `Environment3D` ancestor and keeps its snapshot updated as the node moves or
 * changes color. Meshes inside the same environment sample it without any space
 * or pass involvement.
 */
export abstract class Light3D extends Node3D {
  /** Color and intensity of the light. */
  public readonly color: Store<Color>

  /** Multiplier applied to the color. */
  public readonly energy: Store<number>

  private _registration: LightRegistration | undefined
  private readonly _connections: EventConnection[] = []

  /** Kind of light produced by this node. */
  public abstract readonly kind: LightKind

  /**
   * @param options - Node configuration plus color and energy.
   * @throws {@link RangeError} If the energy is not finite.
   */
  protected constructor({ color = Color.white, energy = 1, ...options }: Light3DOptions = {}) {
    super(options)
    if (!Number.isFinite(energy)) {
      throw new RangeError('Light energy must be finite.')
    }

    this.color = new Store(color)
    this.energy = new Store(energy)
  }

  /** Snapshot of the light expressed in world space. */
  public get light(): Light {
    return this.createLight()
  }

  /** Whether the light is currently registered in an environment. */
  public get registered(): boolean {
    return this._registration !== undefined
  }

  /**
   * Combines the color with the energy.
   *
   * @returns The emitted color.
   */
  protected get emittedColor(): Color {
    const color = this.color.value
    const energy = this.energy.value

    return new Color(color.r * energy, color.g * energy, color.b * energy, color.a)
  }

  /** Direction the light points to, in world space. */
  protected get worldDirection(): Vector3 {
    const forward = this.globalBasis.forward

    return forward.normalize()
  }

  /**
   * Produces the snapshot of the light in world space.
   *
   * @returns The light sampled by materials.
   */
  protected abstract createLight(): Light

  protected override onLoad(): void {
    super.onLoad()
    this.register()
  }

  protected override onUnload(): void {
    this.unregister()
    super.onUnload()
  }

  protected override onDestroy(): void {
    super.onDestroy()
    this.unregister()
    for (const store of [this.color, this.energy]) {
      if (!store.destroyed) store.destroy()
    }
  }

  private register(): void {
    if (this._registration !== undefined) return
    const environment = resolveEnvironment(this)
    if (environment === undefined) return
    if (environment.destroyed) return

    const light = this.createLight()
    const slot = this.kind === LightKind.directional ? undefined : environment.addPunctual(light)
    if (this.kind === LightKind.directional) environment.setDirectional(light)
    this._registration = { environment, slot }
    this.refresh()

    for (const store of [this.position, this.rotation, this.origin, this.color, this.energy]) {
      this._connections.push(
        store.connect(() => {
          this.refresh()
        }),
      )
    }
  }

  private unregister(): void {
    for (const connection of this._connections) {
      if (!connection.destroyed) connection.destroy()
    }

    this._connections.length = 0
    const registration = this._registration
    this._registration = undefined
    if (registration === undefined || registration.environment.destroyed) return
    if (registration.slot === undefined) {
      registration.environment.setDirectional(undefined)

      return
    }

    registration.environment.removePunctual(registration.slot)
  }

  private refresh(): void {
    const registration = this._registration
    if (registration === undefined || registration.environment.destroyed) return
    const light = this.createLight()
    if (registration.slot === undefined) {
      registration.environment.setDirectional(light)

      return
    }

    registration.environment.updatePunctual(registration.slot, light)
  }
}
