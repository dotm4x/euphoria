import { Store } from '#/core/events/store.js'
import { Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { type Draw2DCommand } from '../commands/draw2d.js'
import { unitQuadMesh } from '../geometry/quad.js'
import { Color } from '../primitives/color.js'

import { CanvasItem2D, type CanvasItem2DOptions } from './canvas-item.js'

/** Configuration for a particle emitter. */
export interface ParticlesNodeOptions extends CanvasItem2DOptions {
  /** Maximum number of alive particles. Defaults to 128. */
  readonly count?: number
  /** Particles emitted per second while emitting. Defaults to 32. */
  readonly emissionRate?: number
  /** Lifetime range in seconds. Defaults to `(0.4, 0.9)`. */
  readonly lifetime?: Vector2
  /** Speed range in local units per second. Defaults to `(30, 90)`. */
  readonly speed?: Vector2
  /** Emission direction in radians. Defaults to `-Math.PI / 2`, upwards. */
  readonly direction?: number
  /** Half angle of the emission cone in radians. Defaults to `Math.PI`. */
  readonly spread?: number
  /** Acceleration in local units per second squared. Defaults to zero. */
  readonly gravity?: Vector2
  /** Size of a particle when born. Defaults to 6. */
  readonly startSize?: number
  /** Size of a particle when it dies. Defaults to the start size. */
  readonly endSize?: number
  /** Color of a particle when born. Defaults to white. */
  readonly startColor?: Color
  /** Color of a particle when it dies. Defaults to transparent. */
  readonly endColor?: Color
  /** Size of the emission rectangle. Defaults to a point. */
  readonly area?: Vector2
  /** Source of randomness in the range [0, 1). Defaults to `Math.random`. */
  readonly random?: () => number
  /** Whether the emitter starts emitting. Defaults to true. */
  readonly emitting?: boolean
}

interface ParticleSettings {
  readonly count: number
  readonly emissionRate: number
  readonly lifetime: Vector2
  readonly speed: Vector2
  readonly direction: number
  readonly spread: number
  readonly gravity: Vector2
  readonly startSize: number
  readonly endSize: number
  readonly startColor: Color
  readonly endColor: Color
  readonly area: Vector2
  readonly random: () => number
}

interface Particle {
  position: Vector2
  velocity: Vector2
  age: number
  lifetime: number
  size: number
}

/**
 * A CPU particle emitter that draws every particle with one shared quad.
 *
 * Particles are updated by the node channel of the time module. Everything the
 * emitter draws shares its material, so the whole effect is batched into a
 * single draw call.
 */
export class ParticlesNode extends CanvasItem2D {
  /** Whether the emitter produces particles. */
  public readonly emitting: Store<boolean>

  private readonly _options: ParticleSettings

  private readonly _particles: Particle[] = []
  private _accumulator: number = 0
  /**
   * @param options - Emission, appearance and canvas item options.
   * @throws {@link RangeError} If the limits are not positive.
   */
  public constructor({
    count = 128,
    emissionRate = 32,
    lifetime = new Vector2(0.4, 0.9),
    speed = new Vector2(30, 90),
    direction = -Math.PI / 2,
    spread = Math.PI,
    gravity = new Vector2(0, 0),
    startSize = 6,
    endSize,
    startColor = Color.white,
    endColor = new Color(1, 1, 1, 0),
    area = new Vector2(0, 0),
    random = Math.random,
    emitting = true,
    ...options
  }: ParticlesNodeOptions = {}) {
    super(options)
    if (!Number.isInteger(count) || count < 1) {
      throw new RangeError('Particle emitters require a positive count.')
    }

    if (!Number.isFinite(emissionRate) || emissionRate < 0) {
      throw new RangeError('The emission rate must be a nonnegative number.')
    }

    this._options = {
      count,
      emissionRate,
      lifetime,
      speed,
      direction,
      spread,
      gravity,
      startSize,
      endSize: endSize ?? startSize,
      startColor,
      endColor,
      area,
      random,
    }
    this.emitting = new Store(emitting)
  }

  /** Number of alive particles. */
  public get particleCount(): number {
    return this._particles.length
  }

  /**
   * Emits a number of particles at once.
   *
   * @param count - Particles to emit.
   */
  public burst(count: number = 8): void {
    for (let index = 0; index < count; index++) this.spawn()
  }

  /** Removes every alive particle. */
  public clear(): void {
    this._particles.length = 0
  }

  /**
   * Advances the simulation.
   *
   * @param context - Elapsed time since the previous update.
   */
  public update(context: { readonly deltaTime: number }): void {
    if (this.destroyed) return
    const delta = context.deltaTime
    if (!Number.isFinite(delta) || delta <= 0) return
    const gravity = this._options.gravity
    for (const particle of this._particles) {
      particle.age += delta
      particle.velocity = particle.velocity.add(new Vector2(gravity.x * delta, gravity.y * delta))
      particle.position = particle.position.add(
        new Vector2(particle.velocity.x * delta, particle.velocity.y * delta),
      )
    }

    for (let index = this._particles.length - 1; index >= 0; index--) {
      const particle = this._particles[index]
      if (particle === undefined || particle.age >= particle.lifetime)
        this._particles.splice(index, 1)
    }

    if (!this.emitting.value) return
    this._accumulator += delta * this._options.emissionRate
    while (this._accumulator >= 1) {
      this._accumulator -= 1
      this.spawn()
    }
  }

  /** @inheritDoc */
  protected override collectDraw(commands: Draw2DCommand[]): void {
    const startColor = this._options.startColor
    const endColor = this._options.endColor
    const startSize = this._options.startSize
    const endSize = this._options.endSize
    for (const particle of this._particles) {
      const progress = Math.min(1, particle.age / particle.lifetime)
      const color = Color.lerp(startColor, endColor, progress)
      const size = startSize + (endSize - startSize) * progress
      commands.push(
        this.createCommand(
          unitQuadMesh,
          Matrix3x2.scaling(size, size).multiply(
            Matrix3x2.translation(particle.position.x, particle.position.y),
          ),
          { tint: color },
        ),
      )
    }
  }

  protected override onDestroy(): void {
    this._particles.length = 0
    if (!this.emitting.destroyed) this.emitting.destroy()
    super.onDestroy()
  }

  private spawn(): void {
    if (this._particles.length >= this._options.count) return
    const random = this._options.random
    const area = this._options.area
    const lifetime = this._options.lifetime
    const speed = this._options.speed
    const spread = this._options.spread
    const angle = this._options.direction + (random() * 2 - 1) * spread
    const velocity = speed.x + (speed.y - speed.x) * random()
    this._particles.push({
      position: new Vector2((random() - 0.5) * area.x, (random() - 0.5) * area.y),
      velocity: new Vector2(Math.cos(angle) * velocity, Math.sin(angle) * velocity),
      age: 0,
      lifetime: lifetime.x + (lifetime.y - lifetime.x) * random(),
      size: this._options.startSize,
    })
  }
}
