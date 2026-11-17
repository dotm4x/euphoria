import { Store } from '#/core/events/store.js'
import { Node3D, type Node3DOptions } from '#/math/nodes/node3d.js'

import { Draw3DCommand } from '../commands/draw3d.js'
import { DrawData } from '../data.js'
import { type GraphicMesh3D } from '../geometry/mesh3d.js'
import { type DrawContext } from '../interfaces/context.js'
import { type Drawable } from '../interfaces/drawable.js'
import { Color } from '../primitives/color.js'
import { type BlendMode } from '../resources/blend-mode.js'
import { type LightEnvironment } from '../resources/light-environment.js'
import { type GraphicMaterial } from '../resources/material.js'

import { resolveEnvironment } from './environment.js'

/** Configuration for a visual three-dimensional node. */
export interface VisualInstance3DOptions extends Node3DOptions {
  /** Material used to draw this node. Defaults to the nearest ancestor material. */
  readonly material?: GraphicMaterial
  /** Color multiplied with the rendered color. Defaults to white. */
  readonly modulate?: Color
  /** Draw order within its space. Defaults to zero. */
  readonly order?: number
  /** Blend mode that overrides the material one. Defaults to the material mode. */
  readonly blend?: BlendMode
}

/**
 * Base class of the three-dimensional visual nodes.
 *
 * A visual node owns its material, tint and order, inherits them from its
 * nearest visual ancestor and attaches the lights of its nearest environment to
 * every command. Subclasses only provide geometry; spaces and backends treat
 * the result like any other command.
 */
export abstract class VisualInstance3D extends Node3D implements Drawable {
  /** Material used to draw this node, or undefined to inherit it. */
  public readonly material: Store<GraphicMaterial | undefined>

  /** Color multiplied with the rendered color. */
  public readonly modulate: Store<Color>

  /** Draw order within the space that contains the node. */
  public readonly order: Store<number>

  /** Blend mode that overrides the material one. */
  public readonly blend: Store<BlendMode | undefined>

  /**
   * @param options - Transformation, material, tint, order and blending.
   */
  protected constructor({
    material,
    modulate = Color.white,
    order = 0,
    blend,
    ...options
  }: VisualInstance3DOptions = {}) {
    super(options)
    this.material = new Store<GraphicMaterial | undefined>(material)
    this.modulate = new Store(modulate)
    this.order = new Store(order)
    this.blend = new Store<BlendMode | undefined>(blend)
  }

  /** Geometry drawn by the default implementation, or undefined when absent. */
  protected get shapeMesh(): GraphicMesh3D | undefined {
    return undefined
  }

  /** @inheritDoc */
  public draw(_context: DrawContext): DrawData {
    const commands: Draw3DCommand[] = []
    if (!this.destroyed && this.visible.value) this.collectDraw(commands)

    return new DrawData(commands)
  }

  /**
   * Produces the commands of this node.
   *
   * @param commands - Command list that receives the results.
   */
  protected collectDraw(commands: Draw3DCommand[]): void {
    const mesh = this.shapeMesh
    if (mesh === undefined || mesh.destroyed) return
    commands.push(this.createCommand(mesh))
  }

  /**
   * Creates a command that inherits the material, tint and environment of this node.
   *
   * @param mesh - Geometry to draw.
   * @returns A draw command ready to be collected.
   * @throws {@link Error} If no material is available.
   */
  protected createCommand(mesh: GraphicMesh3D): Draw3DCommand {
    return new Draw3DCommand({
      mesh,
      material: this.resolveMaterial(),
      transform: this.globalTransform,
      environment: this.resolveEnvironment(),
      order: this.order.value,
      tint: this.resolveTint(),
      blend: this.blend.value,
    })
  }

  /**
   * Finds the material of this node or of its nearest visual ancestor.
   *
   * @returns The material used to draw this node.
   * @throws {@link Error} If no material is available.
   */
  protected resolveMaterial(): GraphicMaterial {
    const own = this.material.value
    if (own !== undefined) return own
    let ancestor = this.parent
    while (ancestor !== undefined) {
      if (ancestor instanceof VisualInstance3D) {
        const material = ancestor.material.value
        if (material !== undefined) return material
      }

      ancestor = ancestor.parent
    }

    throw new Error('A visual instance requires a material.')
  }

  /**
   * Combines the modulate of every visual ancestor with the color of this node.
   *
   * @returns The resulting tint, or undefined when it does not change the colors.
   */
  protected resolveTint(): Color | undefined {
    let color = this.modulate.value
    let ancestor = this.parent
    while (ancestor !== undefined) {
      if (ancestor instanceof VisualInstance3D) color = color.multiply(ancestor.modulate.value)

      ancestor = ancestor.parent
    }

    return color.r === 1 && color.g === 1 && color.b === 1 && color.a === 1 ? undefined : color
  }

  /**
   * Finds the environment that applies to this node.
   *
   * @returns The nearest environment, or undefined when the node has none.
   */
  protected resolveEnvironment(): LightEnvironment | undefined {
    return resolveEnvironment(this)
  }

  protected override onDestroy(): void {
    for (const store of [this.material, this.modulate, this.order, this.blend]) {
      if (!store.destroyed) store.destroy()
    }

    super.onDestroy()
  }
}
