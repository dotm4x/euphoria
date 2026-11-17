import { type DrawCommand } from '../commands/command.js'
import { type Viewport } from '../primitives/viewport.js'
import { type RenderTarget } from '../resources/targets/target.js'

import { type Camera } from './camera.js'

/**
 * A destination that executes drawing commands.
 *
 * Drawable objects use the sink to render nested views, such as the contents of
 * a viewport node, without depending on a specific rendering backend.
 */
export interface DrawSink {
  /**
   * Executes commands on a drawing destination.
   *
   * @param commands - The commands to execute, in order.
   * @param context - The camera and viewport context, or undefined for context-free commands.
   * @param target - The offscreen target, or undefined to draw to the window.
   */
  render(commands: Iterable<DrawCommand>, context?: DrawContext, target?: RenderTarget): void
}

/**
 * The state available while producing drawing data for a frame.
 *
 * A drawing context contains frame-specific state used by drawable objects to
 * produce {@link DrawData}. It does not execute drawing operations or depend on
 * a specific rendering backend.
 */
export interface DrawContext {
  /**
   * Camera used to draw the current view.
   *
   * The camera is required; views without a camera are rejected before their
   * commands are produced.
   */
  readonly camera: Camera

  /**
   * Delta time of the update that produced the current frame, in seconds.
   *
   * The value comes from the update that drives drawing and is not necessarily
   * the elapsed time between two frames.
   */
  readonly deltaTime: number

  /** Viewport in which the current view is drawn. */
  readonly viewport: Viewport

  /**
   * Destination that executes nested drawing, or undefined when the context
   * cannot render offscreen.
   */
  readonly sink?: DrawSink | undefined
}
