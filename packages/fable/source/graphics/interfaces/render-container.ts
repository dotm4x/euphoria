import { type DrawCommand } from '../commands/command.js'

import { type DrawContext } from './context.js'

/**
 * A drawable object that renders its own children.
 *
 * Node traversal collects the children of a container through
 * {@link collectChildren} and does not visit them again, so containers can
 * reorder, clip or redirect the drawing of their subtree.
 */
export interface RenderContainer {
  /**
   * Produces the commands of the children of this object.
   *
   * @param context - Frame state available while drawing.
   * @returns The commands that represent the children of this object.
   */
  collectChildren(context: DrawContext): DrawCommand[]
}
