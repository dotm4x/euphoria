import { type Node } from '#/core/node/node.js'

import { isListener, isPlayable, type Listener, type Playable } from './interfaces/playable.js'

/** What a traversal of the scene graph found. */
export interface CollectedPlayback {
  /** Objects that describe a voice, in hierarchy order. */
  readonly playables: readonly Playable[]
  /** First listener found in the traversal, when there is one. */
  readonly listener: Listener | undefined
}

/**
 * Collects the sound sources of a node and its descendants, in hierarchy order.
 *
 * Destroyed and unloaded nodes are skipped together with their subtrees, so a
 * scene that is not loaded stays silent. Visibility is ignored: a hidden node
 * keeps sounding, which lets a game hide visuals without muting them.
 *
 * @param node - Node to collect from.
 * @param collected - Receives the objects that describe a voice.
 * @returns The listener found in the first node that provides one.
 */
export function collectNodeSound(node: Node, collected: Playable[]): Listener | undefined {
  if (node.destroyed || !node.loaded) return undefined
  if (isPlayable(node)) collected.push(node)

  let listener: Listener | undefined = isListener(node) ? node : undefined
  for (const child of node.children) {
    const found = collectNodeSound(child, collected)
    listener ??= found
  }

  return listener
}
