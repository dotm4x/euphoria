import { Resource } from '#/core/primitives/resource.js'
import { type Vector3 } from '#/math/primitives/vectors/vector3.js'

import { Color } from '../primitives/color.js'

/** Kinds of lights supported by the standard three-dimensional material. */
export enum LightKind {
  /** Light with parallel rays coming from a direction. */
  directional = 'directional',
  /** Light radiating in every direction from a position. */
  omni = 'omni',
  /** Light radiating inside a cone from a position. */
  spot = 'spot',
}

/** An immutable light sample used by materials. */
export interface Light {
  /** Kind of light. */
  readonly kind: LightKind
  /** Color and intensity of the light. */
  readonly color: Color
  /** World position of the light; ignored by directional lights. */
  readonly position: Vector3
  /** Unit direction the light points to; ignored by omni lights. */
  readonly direction: Vector3
  /** Distance at which the light fades out; ignored by directional lights. */
  readonly range: number
  /** Cosine of the half angle of the cone; only used by spot lights. */
  readonly coneCosine: number
}

/** Configuration for a light environment. */
export interface LightEnvironmentOptions {
  /** Ambient color added to every surface. Defaults to black. */
  readonly ambient?: Color
}

/** Number of punctual lights supported by the standard material. */
export const maximumPunctualLights = 8

/**
 * The lights sampled by three-dimensional materials.
 *
 * The environment is a resource, independent from spaces and cameras: drawables
 * borrow it and attach it to their commands, and backends read it while drawing.
 * A scene shares one environment through an `Environment3D` node.
 */
export class LightEnvironment extends Resource {
  private readonly _punctual: (Light | undefined)[] = []
  private _directional: Light | undefined
  private _ambient: Color

  /**
   * @param options - Initial ambient color.
   */
  public constructor({ ambient = Color.black }: LightEnvironmentOptions = {}) {
    super()
    this._ambient = ambient
  }

  /** Ambient color added to every surface. */
  public get ambient(): Color {
    return this._ambient
  }

  public set ambient(value: Color) {
    this.throwIfDestroyed()
    this._ambient = value
  }

  /** Directional light, or undefined when the environment has none. */
  public get directional(): Light | undefined {
    return this._directional
  }

  /** Punctual lights in their slots, without empty entries. */
  public get punctual(): readonly Light[] {
    return this._punctual.filter((light): light is Light => light !== undefined)
  }

  /**
   * Replaces the directional light.
   *
   * @param light - Directional light to use, or undefined to remove it.
   * @throws {@link Error} If the light is not directional.
   */
  public setDirectional(light: Light | undefined): void {
    this.throwIfDestroyed()
    if (light !== undefined && light.kind !== LightKind.directional) {
      throw new Error('The directional slot only accepts directional lights.')
    }

    this._directional = light
  }

  /**
   * Stores a punctual light in a free slot.
   *
   * @param light - Punctual light to add.
   * @returns The slot that holds the light.
   * @throws {@link Error} If the light is directional or no slot is free.
   */
  public addPunctual(light: Light): number {
    this.throwIfDestroyed()
    if (light.kind === LightKind.directional) {
      throw new Error('Directional lights cannot be stored in punctual slots.')
    }

    let index = this._punctual.indexOf(undefined)
    if (index === -1) {
      if (this._punctual.length >= maximumPunctualLights) {
        throw new Error('The environment already holds every punctual light it supports.')
      }

      index = this._punctual.length
    }

    this._punctual[index] = light

    return index
  }

  /**
   * Replaces the light of a punctual slot.
   *
   * @param index - Slot that holds the light.
   * @param light - New punctual light.
   * @throws {@link RangeError} If the slot is outside the supported range.
   * @throws {@link Error} If the light is directional.
   */
  public updatePunctual(index: number, light: Light): void {
    this.throwIfDestroyed()
    this.assertSlot(index)
    if (light.kind === LightKind.directional) {
      throw new Error('Directional lights cannot be stored in punctual slots.')
    }

    this._punctual[index] = light
  }

  /**
   * Frees a punctual slot.
   *
   * @param index - Slot to free.
   * @throws {@link RangeError} If the slot is outside the supported range.
   */
  public removePunctual(index: number): void {
    this.throwIfDestroyed()
    this.assertSlot(index)
    this._punctual[index] = undefined
  }

  /** Removes every light, keeping the ambient color. */
  public clear(): void {
    this.throwIfDestroyed()
    this._directional = undefined
    this._punctual.length = 0
  }

  protected override onDestroy(): void {
    this._directional = undefined
    this._punctual.length = 0
    super.onDestroy()
  }

  private assertSlot(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= maximumPunctualLights) {
      throw new RangeError('Punctual light slots range from zero to seven.')
    }
  }
}
