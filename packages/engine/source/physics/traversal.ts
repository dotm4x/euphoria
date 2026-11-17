import { type Node } from '#/core/node/node.js'

import { type BodyDescriptor2D } from './descriptors/2d/body.js'
import { type BodyDescriptor3D } from './descriptors/3d/body.js'
import { type SimulationContext } from './interfaces/context.js'
import {
  isSimulable2D,
  isSimulable3D,
  type Simulable2D,
  type Simulable3D,
} from './interfaces/simulable.js'

/** A two-dimensional body descriptor together with the object that produced it. */
export interface CollectedBody2D {
  /** Object that produced the descriptor and receives its resolved state. */
  readonly owner: Simulable2D
  /** The body to simulate. */
  readonly descriptor: BodyDescriptor2D
}

/** A three-dimensional body descriptor together with the object that produced it. */
export interface CollectedBody3D {
  /** Object that produced the descriptor and receives its resolved state. */
  readonly owner: Simulable3D
  /** The body to simulate. */
  readonly descriptor: BodyDescriptor3D
}

/**
 * Collects the bodies of a node and its descendants, in hierarchy order.
 *
 * Destroyed nodes are skipped together with their subtrees. Visibility is
 * ignored, so hidden nodes keep colliding. Nodes that only produce drawing
 * data contribute no bodies.
 *
 * @param node - Node to collect from.
 * @param context - Step state offered to simulable nodes.
 * @param bodies - List that receives the collected bodies.
 */
export function collectNodeBodies2D(
  node: Node,
  context: SimulationContext,
  bodies: CollectedBody2D[],
): void {
  if (node.destroyed) return
  if (node.loaded && isSimulable2D(node)) {
    for (const descriptor of node.simulate(context).bodies) {
      bodies.push({ owner: node, descriptor })
    }
  }

  for (const child of [...node.children]) collectNodeBodies2D(child, context, bodies)
}

/**
 * Collects the bodies of a node and its descendants in space, in hierarchy order.
 *
 * Destroyed nodes are skipped together with their subtrees. Visibility is
 * ignored, so hidden nodes keep colliding. Nodes that only produce drawing
 * data contribute no bodies.
 *
 * @param node - Node to collect from.
 * @param context - Step state offered to simulable nodes.
 * @param bodies - List that receives the collected bodies.
 */
export function collectNodeBodies3D(
  node: Node,
  context: SimulationContext,
  bodies: CollectedBody3D[],
): void {
  if (node.destroyed) return
  if (node.loaded && isSimulable3D(node)) {
    for (const descriptor of node.simulate(context).bodies) {
      bodies.push({ owner: node, descriptor })
    }
  }

  for (const child of [...node.children]) collectNodeBodies3D(child, context, bodies)
}
