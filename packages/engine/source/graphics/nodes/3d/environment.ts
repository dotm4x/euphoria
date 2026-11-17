import { Store } from '#/core/events/store.js'
import { type Node } from '#/core/node/node.js'
import { Node3D, type Node3DOptions } from '#/math/nodes/node3d.js'

import { LightEnvironment } from '../../resources/light-environment.js'

/** Configuration for the environment node. */
export interface Environment3DOptions extends Node3DOptions {
  /** Environment to expose, whose ownership transfers to the node. Defaults to a new one. */
  readonly environment?: LightEnvironment
}

/**
 * A node that provides the lights of its subtree.
 *
 * Visual nodes and light nodes resolve the nearest `Environment3D` ancestor, so
 * grouping a scene under one environment styles every mesh inside it. The
 * environment is a resource and the node only exposes it: no space, pass or
 * traversal needs to know about lighting.
 */
export class Environment3D extends Node3D {
  /** Environment exposed to the subtree. */
  public readonly environment: Store<LightEnvironment>

  /**
   * @param options - Node configuration and the environment to expose.
   */
  public constructor({
    environment = new LightEnvironment(),
    ...options
  }: Environment3DOptions = {}) {
    super(options)
    this.environment = new Store(environment)
  }

  protected override onDestroy(): void {
    super.onDestroy()
    const environment = this.environment.value
    if (!this.environment.destroyed) this.environment.destroy()
    if (!environment.destroyed) environment.destroy()
  }
}

/**
 * Finds the environment that applies to a node.
 *
 * @param node - Node whose ancestors are inspected.
 * @returns The nearest environment, or undefined when the node has none.
 */
export function resolveEnvironment(node: Node): LightEnvironment | undefined {
  let ancestor: Node | undefined = node
  while (ancestor !== undefined) {
    if (ancestor instanceof Environment3D) return ancestor.environment.value
    ancestor = ancestor.parent
  }

  return undefined
}
