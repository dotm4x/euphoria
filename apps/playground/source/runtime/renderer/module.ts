import {
  type Color,
  NodeRenderSpace,
  type RenderBackend,
  RendererModule,
  type RenderSpace,
} from '@euphoria/engine'

import { PlaygroundScenesModule } from '../scenes/module.js'

import { CameraBinding } from './camera-binding.js'

/** Configuration for the renderer module of the playground. */
export interface PlaygroundRendererOptions {
  /** Backend that draws the scenes, owned by the module. */
  readonly backend: RenderBackend
  /** Background the canvas is cleared with; defaults to black. */
  readonly background?: Color | undefined
}

/**
 * Draws the active scene of the playground.
 *
 * The space and the camera binding are components of the module, so the module
 * composes the space that follows the camera of the scenes module.
 */
export class PlaygroundRendererModule extends RendererModule {
  /**
   * @param options - Backend that draws the scenes.
   */
  public constructor({ backend, background }: PlaygroundRendererOptions) {
    super({
      backend,
      dependencies: [{ type: PlaygroundScenesModule }],
      ...(background === undefined ? {} : { clearColor: background }),
    })
  }

  protected override *compose(): Generator<RenderSpace, void, unknown> {
    const scenes = this.require(PlaygroundScenesModule)
    yield new NodeRenderSpace({
      identifier: 'scene',
      camera: new CameraBinding(scenes.camera),
      scenes,
    })
  }
}
