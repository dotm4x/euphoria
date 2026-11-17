import { Store } from '#/core/events/store.js'
import { Node2D } from '#/math/nodes/node2d.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { type DrawData } from '../data.js'
import { type DrawContext } from '../interfaces/context.js'

import { GroupNode } from './group.js'

/** Configuration for a parallax group. */
export interface ParallaxNodeOptions {
  /** Scroll factor per axis. `1` follows the world and `0` stays on screen. */
  readonly factor?: Vector2
  /** Constant offset added after scrolling. Defaults to the origin. */
  readonly offset?: Vector2
}

/**
 * A group that scrolls its children at a different speed than the camera.
 *
 * A factor of one moves the children with the world, while zero keeps them
 * fixed on the screen. The position of the group is recalculated on every frame
 * from the camera position.
 */
export class ParallaxNode extends GroupNode {
  /** Scroll factor per axis. */
  public readonly factor: Store<Vector2>

  /** Constant offset added after scrolling. */
  public readonly offset: Store<Vector2>

  /**
   * @param options - Group options plus the scroll factor and offset.
   */
  public constructor({
    factor = new Vector2(0.5, 0.5),
    offset = new Vector2(0, 0),
    ...options
  }: ParallaxNodeOptions & ConstructorParameters<typeof GroupNode>[0] = {}) {
    super(options)
    this.factor = new Store(factor)
    this.offset = new Store(offset)
  }

  /** @inheritDoc */
  public override draw(context: DrawContext): DrawData {
    if (context.camera instanceof Node2D) {
      const position = context.camera.globalPosition
      const factor = this.factor.value
      const offset = this.offset.value
      this.position.value = new Vector2(
        position.x * (1 - factor.x) + offset.x,
        position.y * (1 - factor.y) + offset.y,
      )
    }

    return super.draw(context)
  }
}
