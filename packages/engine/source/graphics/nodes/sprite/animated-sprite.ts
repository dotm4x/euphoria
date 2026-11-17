import { type ReadOnlySignal, Signal } from '#/core/events/signal.js'
import { Store } from '#/core/events/store.js'
import { Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { type GraphicMesh2D } from '../../geometry/mesh2d.js'
import { type Color } from '../../primitives/color.js'
import { CanvasItem2D, type CanvasItem2DOptions } from '../canvas-item.js'

import { type SpriteFrames } from './resources/sprite-frames.js'
import { createRegionMesh, type SpriteRegion } from './resources/sprite-region.js'

/** Minimal interface of the updates offered to animated sprites. */
export interface AnimationUpdate {
  /** Elapsed seconds since the previous update. */
  readonly deltaTime: number
}

/** Configuration for an animated sprite node. */
export interface AnimatedSpriteNodeOptions extends CanvasItem2DOptions {
  /** Shared animations played by the sprite. */
  readonly frames: SpriteFrames
  /** Animation played first. Defaults to the first registered one. */
  readonly animation?: string
  /** Playback speed multiplier. Defaults to one. */
  readonly speed?: number
  /** Whether playback restarts at the end. Defaults to true. */
  readonly looping?: boolean
  /** Whether the sprite starts playing on construction. Defaults to true. */
  readonly autoplaying?: boolean
  /** Size of the sprite in local units. Defaults to one unit. */
  readonly size?: Vector2
  /** Color multiplied with the texture. Defaults to white. */
  readonly color?: Color
  /** Whether the sprite is centered on its origin. Defaults to true. */
  readonly centered?: boolean
}

/**
 * A sprite that plays named animations from a {@link SpriteFrames} collection.
 *
 * Each region is uploaded once, so changing frames does not create geometry at
 * runtime. The node is updated by the node channel of the time module.
 */
export class AnimatedSpriteNode extends CanvasItem2D {
  private readonly _frames: SpriteFrames
  private readonly _meshes: Map<SpriteRegion, GraphicMesh2D> = new Map<
    SpriteRegion,
    GraphicMesh2D
  >()

  private readonly _onFinished: Signal<[animation: string]> = new Signal<[animation: string]>()
  private _animation: string
  private _frame: number = 0
  private _elapsed: number = 0
  private _playing: boolean

  /** Playback speed multiplier. */
  public readonly speed: Store<number>

  /** Whether playback restarts at the end. */
  public readonly looping: Store<boolean>

  /** Size of the sprite in local units. */
  public readonly size: Store<Vector2>

  /** Whether the sprite is centered on its origin. */
  public readonly centered: boolean

  /**
   * Fired with the animation name when it reaches its last frame, whether it
   * loops or stops.
   */
  public readonly onFinished: ReadOnlySignal<[animation: string]> = this._onFinished

  /**
   * @param options - Animations, playback settings, size and color.
   * @throws {@link Error} If no animation is available.
   */
  public constructor({
    frames,
    animation,
    speed = 1,
    looping = true,
    autoplaying = true,
    size = new Vector2(1, 1),
    color,
    centered = true,
    ...options
  }: AnimatedSpriteNodeOptions) {
    super({ ...(color === undefined ? {} : { selfModulate: color }), ...options })
    const name = animation ?? frames.animations[0]
    if (name === undefined || !frames.has(name)) {
      throw new Error('Animated sprites require an existing animation.')
    }

    this._frames = frames
    this._animation = name
    this._playing = autoplaying
    this.speed = new Store(speed)
    this.looping = new Store(looping)
    this.size = new Store(size)
    this.centered = centered
  }

  /** Animation currently selected. */
  public get animation(): string {
    return this._animation
  }

  /** Index of the frame being displayed. */
  public get frame(): number {
    return this._frame
  }

  /** Whether playback is active. */
  public get playing(): boolean {
    return this._playing
  }

  /** @inheritDoc */
  protected override get shapeMesh(): GraphicMesh2D {
    const frames = this._frames.framesOf(this._animation)
    const region = frames?.[this._frame]?.region
    if (region === undefined) throw new Error('The animation has no frames.')

    const cached = this._meshes.get(region)
    if (cached !== undefined) return cached
    const mesh = createRegionMesh(region)
    this._meshes.set(region, mesh)

    return mesh
  }

  /** @inheritDoc */
  protected override get shapeTransform(): Matrix3x2 {
    const size = this.size.value
    const transform = Matrix3x2.scaling(size.x, size.y)
    if (this.centered) return transform

    return transform.multiply(Matrix3x2.translation(size.x / 2, size.y / 2))
  }

  /**
   * Plays an animation.
   *
   * @param animation - Animation to play. Defaults to the current one.
   * @param restarting - Whether to restart the animation when it is already selected.
   * @throws {@link Error} If the animation does not exist.
   */
  public play(animation: string = this._animation, restarting = false): void {
    if (!this._frames.has(animation)) {
      throw new Error(`The animation '${animation}' does not exist.`)
    }

    if (animation !== this._animation || restarting) {
      this._animation = animation
      this._frame = 0
      this._elapsed = 0
    }

    this._playing = true
  }

  /** Stops playback and keeps the current frame. */
  public stop(): void {
    this._playing = false
  }

  /**
   * Advances the animation.
   *
   * @param context - Elapsed time since the previous update.
   */
  public update(context: AnimationUpdate): void {
    if (!this._playing || this.destroyed) return
    const list = this._frames.framesOf(this._animation)
    if (list === undefined) return
    const speed = this.speed.value
    if (!Number.isFinite(speed) || speed <= 0) return

    this._elapsed += context.deltaTime * speed
    let frame = this._frame
    let current = list[frame]
    while (current !== undefined && this._elapsed >= current.duration) {
      this._elapsed -= current.duration
      frame++
      if (frame >= list.length) {
        if (!this.looping.value) {
          this._frame = list.length - 1
          this._elapsed = 0
          this._playing = false
          this._onFinished.fire(this._animation)

          return
        }

        frame = 0
        this._onFinished.fire(this._animation)
      }

      current = list[frame]
    }

    this._frame = frame
  }

  protected override onDestroy(): void {
    super.onDestroy()
    for (const mesh of this._meshes.values()) {
      if (!mesh.destroyed) mesh.destroy()
    }

    this._meshes.clear()
    if (!this.speed.destroyed) this.speed.destroy()
    if (!this.looping.destroyed) this.looping.destroy()
    if (!this.size.destroyed) this.size.destroy()
    if (!this._onFinished.destroyed) this._onFinished.destroy()
  }
}
