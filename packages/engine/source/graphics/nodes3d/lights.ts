import { Store } from '#/core/events/store.js'

import { type Light, LightKind } from '../resources/light-environment.js'

import { Light3D, type Light3DOptions } from './light.js'

/** Configuration for a directional light. */
export type DirectionalLight3DOptions = Light3DOptions

/**
 * A light with parallel rays coming from the direction the node faces.
 *
 * The node looks towards its local negative Z axis, so rotating it aims the
 * light while its position is ignored.
 */
export class DirectionalLight3D extends Light3D {
  /** @inheritDoc */
  public readonly kind: LightKind = LightKind.directional

  /**
   * @param options - Node configuration plus color and energy.
   */
  public constructor(options: DirectionalLight3DOptions = {}) {
    super(options)
  }

  /** @inheritDoc */
  protected override createLight(): Light {
    return {
      kind: this.kind,
      color: this.emittedColor,
      position: this.globalPosition,
      direction: this.worldDirection,
      range: Number.POSITIVE_INFINITY,
      coneCosine: 0,
    }
  }
}

/** Configuration for an omni light. */
export interface OmniLight3DOptions extends Light3DOptions {
  /** Distance at which the light fades out. Defaults to ten units. */
  readonly range?: number
}

/** A light radiating in every direction from the position of the node. */
export class OmniLight3D extends Light3D {
  /** Distance at which the light fades out. */
  public readonly range: Store<number>

  /** @inheritDoc */
  public readonly kind: LightKind = LightKind.omni

  /**
   * @param options - Node configuration plus color, energy and range.
   * @throws {@link RangeError} If the range is not positive.
   */
  public constructor({ range = 10, ...options }: OmniLight3DOptions = {}) {
    super(options)
    if (!Number.isFinite(range) || range <= 0) {
      throw new RangeError('Light ranges must be greater than zero.')
    }

    this.range = new Store(range)
  }

  /** @inheritDoc */
  protected override createLight(): Light {
    return {
      kind: this.kind,
      color: this.emittedColor,
      position: this.globalPosition,
      direction: this.worldDirection,
      range: this.range.value,
      coneCosine: 0,
    }
  }

  protected override onDestroy(): void {
    super.onDestroy()
    if (!this.range.destroyed) this.range.destroy()
  }
}

/** Configuration for a spot light. */
export interface SpotLight3DOptions extends OmniLight3DOptions {
  /** Full angle of the cone in radians. Defaults to 45°. */
  readonly angle?: number
}

/** A light radiating inside a cone around the direction the node faces. */
export class SpotLight3D extends OmniLight3D {
  /** Full angle of the cone in radians. */
  public readonly angle: Store<number>

  /** @inheritDoc */
  public override readonly kind: LightKind = LightKind.spot

  /**
   * @param options - Node configuration plus color, energy, range and angle.
   * @throws {@link RangeError} If the angle is outside its valid range.
   */
  public constructor({ angle = Math.PI / 4, ...options }: SpotLight3DOptions = {}) {
    super(options)
    if (!Number.isFinite(angle) || angle <= 0 || angle >= Math.PI) {
      throw new RangeError('Spot light angles must be between zero and pi radians.')
    }

    this.angle = new Store(angle)
  }

  /** @inheritDoc */
  protected override createLight(): Light {
    return {
      ...super.createLight(),
      kind: this.kind,
      coneCosine: Math.cos(this.angle.value / 2),
    }
  }

  protected override onDestroy(): void {
    super.onDestroy()
    if (!this.angle.destroyed) this.angle.destroy()
  }
}
