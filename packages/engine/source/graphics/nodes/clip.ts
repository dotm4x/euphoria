import { Store } from '#/core/events/store.js'
import { Bounds2 } from '#/math/geometry/bounds2.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { type ClippingCanvasItem } from './canvas-item.js'
import { GroupNode } from './group.js'

/** Configuration for a clipping group. */
export interface ClipNodeOptions {
  /** Size of the clipping rectangle, in local units. */
  readonly size: Vector2
}

/**
 * A group that clips the items drawn inside it.
 *
 * The clip is rectangular and axis-aligned in screen space: rotated clips are
 * clipped by the rectangle that encloses their world bounds.
 */
export class ClipNode extends GroupNode implements ClippingCanvasItem {
  /** Size of the clipping rectangle, in local units. */
  public readonly size: Store<Vector2>

  /**
   * @param options - Group options plus the size of the clipping rectangle.
   */
  public constructor({
    size,
    ...options
  }: ClipNodeOptions & ConstructorParameters<typeof GroupNode>[0]) {
    super(options)
    this.size = new Store(size)
  }

  /** World rectangle that clips the items drawn inside this node. */
  public get worldClip(): Bounds2 {
    const size = this.size.value
    const transform = this.globalTransform
    const corners = [
      new Vector2(-size.x / 2, -size.y / 2),
      new Vector2(size.x / 2, -size.y / 2),
      new Vector2(size.x / 2, size.y / 2),
      new Vector2(-size.x / 2, size.y / 2),
    ].map((corner) => transform.transform(corner))

    return Bounds2.fromPoints(corners)
  }
}
