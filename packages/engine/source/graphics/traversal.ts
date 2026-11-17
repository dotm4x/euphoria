import { type Node } from '#/core/node/node.js'

import { type DrawCommand } from './commands/command.js'
import { type DrawContext } from './interfaces/context.js'
import { type Drawable } from './interfaces/drawable.js'
import { type RenderContainer } from './interfaces/render-container.js'

/**
 * Collects the commands of a node and its descendants, in hierarchy order.
 *
 * Destroyed or invisible nodes are skipped together with their subtrees. Nodes
 * that declare a {@link RenderContainer} render their own children, so the
 * traversal does not visit them.
 *
 * @param node - Node to collect from.
 * @param context - Frame state offered to drawable nodes.
 * @param commands - Command list that receives the results.
 */
export function collectNodeCommands(
  node: Node,
  context: DrawContext,
  commands: DrawCommand[],
): void {
  if (node.destroyed || !node.visible.value) return
  if (node.loaded && isDrawable(node)) commands.push(...node.draw(context).commands)
  if (isRenderContainer(node)) {
    commands.push(...node.collectChildren(context))

    return
  }

  for (const child of [...node.children]) collectNodeCommands(child, context, commands)
}

function isDrawable(node: Node): node is Node & Drawable {
  return 'draw' in node && typeof node.draw === 'function'
}

function isRenderContainer(node: Node): node is Node & RenderContainer {
  return 'collectChildren' in node && typeof node.collectChildren === 'function'
}
