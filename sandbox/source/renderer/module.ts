import { NodeRenderSpace, type RenderBackend, RendererModule } from '@dotm4x/fable'

import { type MyScenesModule } from '../scenes/module.js'

/**
 * Draws the active scene, which owns its own viewport and post-processing
 * through the nodes of the scene tree.
 */
export class MyRendererModule extends RendererModule {
  public constructor(backend: RenderBackend, scenes: MyScenesModule) {
    super({
      backend,
      spaces: [
        new NodeRenderSpace({
          identifier: 'scene',
          camera: scenes.camera,
          scenes,
        }),
      ],
    })
  }
}
