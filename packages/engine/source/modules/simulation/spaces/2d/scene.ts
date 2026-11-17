import { type SimulationContext } from '#/physics/interfaces/context.js'
import { type CollectedBody2D, collectNodeBodies2D } from '#/physics/traversal.js'

import { type ScenesModule } from '../../../scenes/module.js'
import { type SimulationFrame2D } from '../../backends/backend.js'

import { SimulationSpace2D, type SimulationSpace2DOptions } from './space.js'

/** Configuration for a space that collects bodies from scene nodes. */
export interface SceneSimulationSpace2DOptions extends Omit<SimulationSpace2DOptions, 'entries'> {
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
export class SceneSimulationSpace2D extends SimulationSpace2D {
  private readonly _scenes: ScenesModule

  /**
   * @param options - Space configuration and the scenes module to borrow.
   */
  public constructor({ scenes, ...options }: SceneSimulationSpace2DOptions) {
    super(options)
    this._scenes = scenes
  }

  /** @inheritDoc */
  public override collect(context: SimulationContext): SimulationFrame2D {
    this.throwIfDestroyed()
    const collected: CollectedBody2D[] = []
    collectNodeBodies2D(this._scenes.activeScene.value, context, collected)

    return this.prepare(collected)
  }
}
