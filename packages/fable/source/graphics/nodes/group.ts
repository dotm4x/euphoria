import { CanvasItem2D, type CanvasItem2DOptions } from './canvas-item.js'

/**
 * A canvas item that draws nothing and groups other items.
 *
 * Children inherit the material and the modulate of the group, so a group can
 * tint, blend or order a whole subtree.
 */
export class GroupNode extends CanvasItem2D {
  /**
   * @param options - Transformation, material, tint, order and blending.
   */
  public constructor(options: CanvasItem2DOptions = {}) {
    super(options)
  }
}
