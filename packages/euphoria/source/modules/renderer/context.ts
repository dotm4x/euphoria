import { type Camera } from '#/graphics/interfaces/camera.js'
import { type DrawContext, type DrawSink } from '#/graphics/interfaces/context.js'
import { type Viewport } from '#/graphics/primitives/viewport.js'

/**
 * Frame state offered to drawable objects.
 *
 * The context does not execute commands and does not depend on a backend.
 */
export class RenderContext implements DrawContext {
  /** Delta time of the update producing the frame, in seconds. */
  public readonly deltaTime: number

  /** Camera used to draw the current view. */
  public readonly camera: Camera

  /** Viewport in which the current view is drawn. */
  public readonly viewport: Viewport

  /** Destination that executes nested drawing, when available. */
  public readonly sink: DrawSink | undefined

  /**
   * @param deltaTime - Delta time of the update producing the frame, in seconds.
   * @param camera - Camera used to draw the current view.
   * @param viewport - Viewport in which the current view is drawn.
   * @param sink - Destination that executes nested drawing.
   */
  public constructor(deltaTime: number, camera: Camera, viewport: Viewport, sink?: DrawSink) {
    this.deltaTime = deltaTime
    this.camera = camera
    this.viewport = viewport
    this.sink = sink
  }
}
