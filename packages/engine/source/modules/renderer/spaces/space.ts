import { ReactiveSet } from '#/core/collections/reactive-set.js'
import { Store } from '#/core/events/store.js'
import { type Identifiable } from '#/core/interfaces/identifiable.js'
import { Node } from '#/core/node/node.js'
import { Destroyable } from '#/core/primitives/destroyable.js'
import { Once } from '#/core/primitives/once.js'
import { type DrawCommand, isSortable } from '#/graphics/commands/command.js'
import { type Camera } from '#/graphics/interfaces/camera.js'
import { type DrawContext } from '#/graphics/interfaces/context.js'
import { type Drawable } from '#/graphics/interfaces/drawable.js'
import { type Viewport } from '#/graphics/primitives/viewport.js'
import { type RenderTarget } from '#/graphics/resources/targets/target.js'
import { collectNodeCommands } from '#/graphics/traversal.js'

import { RenderSortMode } from './sort.js'

/** Drawing priority of a space. Lower priorities are collected first. */
export enum RenderSpacePriority {
  low,
  normal,
  high,
  critical,
}

/** Configuration for a rendering space. */
export interface RenderSpaceOptions {
  /** Unique space identifier. */
  readonly identifier: string
  /** Initial camera used to draw the space. */
  readonly camera: Camera
  /** Collection priority. Defaults to normal. */
  readonly priority?: RenderSpacePriority
  /** Initial offscreen target, or undefined to draw to the window. */
  readonly target?: RenderTarget
  /** Whether commands outside the camera view are skipped. Defaults to true. */
  readonly cull?: boolean
  /**
   * Command ordering. Defaults to {@link RenderSortMode.order}, which keeps the
   * sequence produced by collection.
   */
  readonly sort?: RenderSortMode
  /** Initial viewport, or undefined to cover the whole target. */
  readonly viewport?: Viewport
  /** Initial borrowed drawable entries. */
  readonly entries?: Iterable<Drawable>
}

/**
 * Groups drawable objects and collects their commands into a single space.
 *
 * Entries are borrowed and evaluated in registration order. The space does not
 * execute commands or depend on a backend.
 */
export class RenderSpace extends Destroyable implements Identifiable<string> {
  private readonly _preparation: Once = new Once(
    'Rendering space preparation has already failed or is in progress.',
  )

  /** Unique space identifier. */
  public readonly identifier: string

  /** Borrowed camera used to draw this space. */
  public readonly camera: Store<Camera>

  /** Collection priority. */
  public readonly priority: RenderSpacePriority

  /** Borrowed offscreen target, or undefined to draw to the window. */
  public readonly target: Store<RenderTarget | undefined>

  /** Whether commands outside the camera view are skipped. */
  public readonly cull: boolean

  /** Command ordering applied after collection. */
  public readonly sort: RenderSortMode

  /** Borrowed viewport, or undefined to cover the whole target. */
  public readonly viewport: Store<Viewport | undefined>

  /** Borrowed drawable entries. */
  public readonly entries: ReactiveSet<Drawable>

  /**
   * @param options - Space identifier, camera, priority and initial entries.
   * @throws {@link Error} If the identifier is empty or repeated in the entries.
   */
  public constructor({
    identifier,
    camera,
    priority = RenderSpacePriority.normal,
    target,
    cull = true,
    sort = RenderSortMode.order,
    viewport,
    entries = [],
  }: RenderSpaceOptions) {
    super()
    if (!identifier.trim()) {
      throw new Error('Rendering space identifier must not be empty.')
    }

    this.identifier = identifier
    this.priority = priority
    this.camera = new Store(camera)
    this.target = new Store(target)
    this.cull = cull
    this.sort = sort
    this.viewport = new Store(viewport)
    this.entries = new ReactiveSet(entries)
  }

  /**
   * Collects the commands produced by the space entries.
   *
   * Entries that are nodes are traversed, so containers render their own
   * children. The result is culled and ordered according to the space options.
   *
   * @param context - Frame state offered to drawable entries.
   * @returns Commands in entry and command order.
   * @throws {@link Error} If the space is destroyed or an entry fails.
   */
  public collect(context: DrawContext): DrawCommand[] {
    this.throwIfDestroyed()
    this._preparation.execute(() => {
      for (const entry of this.compose()) this.entries.add(entry)
      this.configure()
    })

    const commands: DrawCommand[] = []
    for (const entry of this.entries) {
      if (entry instanceof Node) {
        collectNodeCommands(entry, context, commands)
      } else {
        commands.push(...entry.draw(context).commands)
      }
    }

    return this.prepare(commands, context)
  }

  /**
   * Culls and orders collected commands according to the space options.
   *
   * Subclasses that collect their own commands, such as node spaces, call this
   * method to share the same options.
   *
   * @param commands - Commands to process, in collection order.
   * @param context - Frame state used by culling and ordering.
   * @returns The commands to draw, in execution order.
   */
  protected prepare(commands: readonly DrawCommand[], context: DrawContext): DrawCommand[] {
    const view = context.camera.view
    const viewProjection = view.multiply(context.camera.getProjection(context.viewport))
    const visible = this.cull
      ? commands.filter((command) => !isSortable(command) || command.isVisible(viewProjection))
      : [...commands]
    const depths = new Map<DrawCommand, number>()
    const batches = new Map<unknown, number>()
    const batchIndices = new Map<DrawCommand, number>()
    for (const command of visible) {
      if (!isSortable(command)) continue
      depths.set(command, command.sortDepth(view))
      if (!batches.has(command.batchKey)) batches.set(command.batchKey, batches.size)
      batchIndices.set(command, batches.get(command.batchKey) ?? 0)
    }

    const mode = this.sort
    visible.sort((left, right) => {
      if (mode === RenderSortMode.batched) {
        const order = orderOf(left) - orderOf(right)
        if (order !== 0) return order

        return (batchIndices.get(left) ?? 0) - (batchIndices.get(right) ?? 0)
      }

      if (mode === RenderSortMode.depth) {
        const transparency = transparencyOf(left) - transparencyOf(right)
        if (transparency !== 0) return transparency

        const depth = (depths.get(right) ?? 0) - (depths.get(left) ?? 0)
        if (depth !== 0) return depth
      }

      return orderOf(left) - orderOf(right)
    })

    return visible
  }

  /** Yields additional borrowed drawable entries, once. */
  protected *compose(): Generator<Drawable, void, unknown> {
    // Override to yield entries.
  }

  /** Configures the space once after composition. */
  protected configure(): void {
    // Override to configure the space.
  }

  protected override onDestroy(): void {
    this.entries.clear()
    if (!this.camera.destroyed) this.camera.destroy()
    if (!this.target.destroyed) this.target.destroy()
    if (!this.viewport.destroyed) this.viewport.destroy()
    super.onDestroy()
  }
}

function orderOf(command: DrawCommand): number {
  return isSortable(command) ? command.order : 0
}

function transparencyOf(command: DrawCommand): number {
  return isSortable(command) && command.transparent ? 1 : 0
}
