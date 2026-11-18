import { type SimulationContext } from '#/physics/interfaces/context.js'
import { type CollectedBody3D, collectNodeBodies3D } from '#/physics/traversal.js'

import { type ScenesModule } from '../../../scenes/module.js'
import { type SimulationFrame3D } from '../../backends/backend.js'

import { SimulationSpace3D, type SimulationSpace3DOptions } from './space.js'

/** Configuration for a space that collects bodies from scene nodes. */
export interface SceneSimulationSpace3DOptions extends Omit<SimulationSpace3DOptions, 'entries'> {
  /** Scenes module whose active scene is borrowed and simulated. */
  readonly scenes: ScenesModule
}

/**
 * Collects bodies from the loaded nodes of the active scene.
 *
 * Nodes are traversed in hierarchy order, so every descendant that can describe
 * bodies takes part in the step. Destroyed nodes are skipped, while hidden ones
 * keep colliding. The scenes module and its nodes are borrowed and never
 * destroyed by this space.
 */
export class SceneSimulationSpace3D extends SimulationSpace3D {
  private readonly _scenes: ScenesModule

  /**
   * @param options - Space configuration and the scenes module to borrow.
   */
  public constructor({ scenes, ...options }: SceneSimulationSpace3DOptions) {
    super(options)
    this._scenes = scenes
  }

  /** @inheritDoc */
  public override collect(context: SimulationContext): SimulationFrame3D {
    this.throwIfDestroyed()
    this.applyComposition()
    const collected: CollectedBody3D[] = []
    collectNodeBodies3D(this._scenes.activeScene.value, context, collected)

    return this.prepare(collected)
  }
}
