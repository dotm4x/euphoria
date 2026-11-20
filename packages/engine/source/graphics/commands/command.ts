import { type Matrix4x4 } from '#/math/primitives/matrices/matrix4x4.js'

import { type ClearCommand } from './clear.js'
import { type Draw2DCommand } from './draw2d.js'

/**
 * A backend-independent drawing operation.
 *
 * A command describes the data required to perform a graphical operation
 * without defining how a rendering backend executes it. Add new command types
 * to this union so backends can dispatch on them exhaustively.
 */
export type DrawCommand = ClearCommand | Draw2DCommand

/**
 * A command that a rendering space can cull and order.
 *
 * Spaces handle commands through this interface, so they never depend on the
 * dimensionality, the material or the geometry of a particular command type.
 */
export interface SortableCommand {
  /** Draw order within its space; lower orders are drawn first. */
  readonly order: number

  /** Whether the command blends with the content already drawn. */
  readonly transparent: boolean

  /**
   * Identity of the state that commands must share to be batched together.
   *
   * Commands with equal keys are candidates for a single batch.
   */
  readonly batchKey: unknown

  /**
   * Distance used to order depth-sorted commands.
   *
   * @param view - Transformation from world space into view space.
   * @returns The distance, where larger values are farther from the camera.
   */
  sortDepth(view: Matrix4x4): number

  /**
   * Checks whether the command can contribute fragments.
   *
   * @param viewProjection - Combined view and projection transformation.
   * @returns Whether the command intersects the view volume.
   */
  isVisible(viewProjection: Matrix4x4): boolean
}

/**
 * Checks whether a command can be culled and ordered by a space.
 *
 * @param command - The command to inspect.
 * @returns Whether the command implements {@link SortableCommand}.
 */
export function isSortable(command: DrawCommand): command is DrawCommand & SortableCommand {
  return 'sortDepth' in command && typeof command.sortDepth === 'function'
}
