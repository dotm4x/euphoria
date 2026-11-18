import { type Camera, type Node, PlaybackModule, ScenesModule, Store } from '@euphoria/engine'

import { PlaygroundInputModule } from '../input/module.js'

/**
 * Hosts the scene a story mounted.
 *
 * The scene is the data the story owns, so it arrives through the constructor;
 * everything else the module needs is a module of its own, which it declares as
 * a dependency.
 */
export class PlaygroundScenesModule extends ScenesModule {
  /** Camera the renderer draws the active scene with. */
  public readonly camera: Store<Camera>

  /**
   * @param scene - Scene whose ownership transfers to the module.
   * @param camera - Camera used to draw the scene.
   */
  public constructor(scene: Node, camera: Camera) {
    super({
      initial: scene,
      dependencies: [{ type: PlaygroundInputModule }, { type: PlaybackModule }],
    })
    this.camera = new Store(camera)
  }

  protected override onDestroy(): void {
    super.onDestroy()
    if (!this.camera.destroyed) this.camera.destroy()
  }
}
