import { type DrawCommand } from '#/graphics/commands/command.js'
import { type DrawContext } from '#/graphics/interfaces/context.js'

/** Extension points invoked by the WebGL backend. */
export interface WebGlBackendHooks {
  /** Called before each drawing command is encoded, for instrumentation or state control. */
  readonly beforeDraw?: (command: DrawCommand, context: DrawContext) => void
  /** Called after a frame is submitted. */
  readonly afterFrame?: () => void
}
