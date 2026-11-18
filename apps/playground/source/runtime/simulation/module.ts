import {
  Dimension,
  SceneSimulationSpace2D,
  SceneSimulationSpace3D,
  type SimulationBackend,
  SimulationModule,
  type SimulationSpaceBinding,
} from '@euphoria/engine'

import { type StoryScene } from '../scene.js'
import { PlaygroundScenesModule } from '../scenes/module.js'

/** Configuration for the simulation module of the playground. */
export interface PlaygroundSimulationOptions {
  /** Scene whose bodies the module steps. */
  readonly scene: StoryScene
  /** Backends whose ownership transfers to the module. */
  readonly physics: readonly SimulationBackend[]
}

/**
 * Steps the bodies of a story scene.
 *
 * The spaces are components of the module: it composes them from the runtimes
 * that need one, wires them to the scene and lets the base class own them.
 */
export class PlaygroundSimulationModule extends SimulationModule {
  private readonly _physics: readonly SimulationBackend[]
  private readonly _scene: StoryScene

  /**
   * @param options - Story scene and the backends its spaces run in.
   */
  public constructor({ scene, physics }: PlaygroundSimulationOptions) {
    super({ dependencies: [{ type: PlaygroundScenesModule }] })
    this._physics = physics
    this._scene = scene
  }

  protected override configure(): void {
    if (this._scene.attach === undefined) return
    for (const space of this.spaces.values()) this._scene.attach(space)
  }

  protected override *compose(): Generator<SimulationSpaceBinding, void, unknown> {
    for (const backend of this._physics) {
      yield {
        space:
          backend.dimension === Dimension.twoDimensional ? this.planarSpace() : this.spatialSpace(),
        backend,
      }
    }
  }

  private planarSpace(): SceneSimulationSpace2D {
    const joints = this._scene.joints2D

    return new SceneSimulationSpace2D({
      identifier: 'scene-2d',
      scenes: this.require(PlaygroundScenesModule),
      ...(joints === undefined ? {} : { joints }),
    })
  }

  private spatialSpace(): SceneSimulationSpace3D {
    const joints = this._scene.joints3D

    return new SceneSimulationSpace3D({
      identifier: 'scene-3d',
      scenes: this.require(PlaygroundScenesModule),
      ...(joints === undefined ? {} : { joints }),
    })
  }
}
