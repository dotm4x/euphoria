import { Resource } from '#/core/primitives/resource.js'

import { type SpriteRegion, validateSpriteRegion } from './sprite-region.js'

/** A frame of an animated sprite. */
export interface SpriteFrame {
  /** Texture region shown by the frame. */
  readonly region: SpriteRegion
  /** Seconds the frame stays visible. Defaults to 0.1. */
  readonly duration?: number
}

/**
 * Named animations built from texture regions.
 *
 * Frames are shared resources: animated sprites borrow them and never destroy
 * them.
 */
export class SpriteFrames extends Resource {
  private readonly _animations: Map<string, readonly Required<SpriteFrame>[]> = new Map<
    string,
    readonly Required<SpriteFrame>[]
  >()

  /** Names of the animations, in insertion order. */
  public get animations(): readonly string[] {
    return [...this._animations.keys()]
  }

  /**
   * Adds an animation, replacing the frames of an existing one.
   *
   * @param animation - Animation name.
   * @param frames - Frames played in order.
   * @returns This collection.
   * @throws {@link Error} If the name is empty or the frames are empty.
   * @throws {@link RangeError} If a frame duration is not positive.
   */
  public add(animation: string, frames: Iterable<SpriteFrame>): this {
    this.throwIfDestroyed()
    if (!animation.trim()) {
      throw new Error('Animation names must not be empty.')
    }

    const list = [...frames]
    if (list.length === 0) {
      throw new Error('An animation requires at least one frame.')
    }

    const normalized = list.map((frame) => {
      validateSpriteRegion(frame.region)
      const duration = frame.duration ?? 0.1
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new RangeError('Frame durations must be greater than zero.')
      }

      return { region: frame.region, duration }
    })
    this._animations.set(animation, Object.freeze(normalized))

    return this
  }

  /** Whether the animation exists. */
  public has(animation: string): boolean {
    return this._animations.has(animation)
  }

  /**
   * Returns the frames of an animation.
   *
   * @param animation - Animation name.
   * @returns The frames, or undefined when the animation does not exist.
   */
  public framesOf(animation: string): readonly Required<SpriteFrame>[] | undefined {
    return this._animations.get(animation)
  }

  protected override onDestroy(): void {
    super.onDestroy()
    this._animations.clear()
  }
}
