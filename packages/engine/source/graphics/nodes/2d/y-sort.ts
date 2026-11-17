import { type Node } from '#/core/node/node.js'
import { collectNodeCommands } from '#/graphics/traversal.js'
import { Node2D } from '#/math/nodes/node2d.js'

import { type DrawCommand } from '../../commands/command.js'
import { type DrawContext } from '../../interfaces/context.js'
import { type RenderContainer } from '../../interfaces/render-container.js'

import { GroupNode } from './group.js'

/**
 * A group that draws its children from the lowest to the highest position.
 *
 * Sorting by the vertical position of each child produces the depth expected by
 * top-down games, where items below others are drawn in front of them.
 */
export class YSortNode extends GroupNode implements RenderContainer {
  /** @inheritDoc */
  public collectChildren(context: DrawContext): DrawCommand[] {
    if (this.destroyed) return []
    const commands: DrawCommand[] = []
    for (const child of this.sortedChildren()) {
      collectNodeCommands(child, context, commands)
    }

    return commands
  }

  private sortedChildren(): Node[] {
    const children = [...this.children]
    const depths = new Map<Node, number>()
    for (const child of children) {
      depths.set(child, child instanceof Node2D ? child.globalPosition.y : 0)
    }

    return children.sort((left, right) => (depths.get(left) ?? 0) - (depths.get(right) ?? 0))
  }
}
