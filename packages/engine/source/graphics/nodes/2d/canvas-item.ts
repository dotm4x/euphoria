import { Store } from '#/core/events/store.js'
import { type Node } from '#/core/node/node.js'
import { Bounds2 } from '#/math/geometry/bounds2.js'
import { Node2D, type Node2DOptions } from '#/math/nodes/node2d.js'
import { Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { Draw2DCommand, type Draw2DCommandOptions } from '../../commands/draw2d.js'
import { DrawData } from '../../data.js'
import { type GraphicMesh2D } from '../../geometry/mesh2d.js'
import { type DrawContext } from '../../interfaces/context.js'
import { type Drawable } from '../../interfaces/drawable.js'
import { Color } from '../../primitives/color.js'
import { type BlendMode } from '../../resources/blend-mode.js'
import { type GraphicMaterial } from '../../resources/material.js'

/** Configuration for a canvas item. */
export interface CanvasItem2DOptions extends Node2DOptions {
  /** Material used to draw this item. Defaults to the nearest ancestor material. */
  readonly material?: GraphicMaterial
  /** Color applied to this item and its children. Defaults to white. */
  readonly modulate?: Color
  /** Color applied only to this item. Defaults to white. */
  readonly selfModulate?: Color
  /** Draw order within its space. Defaults to zero. */
  readonly order?: number
  /** Depth used by spaces that sort back to front. Defaults to zero. */
  readonly depth?: number
  /** Blend mode that overrides the material one. Defaults to the material mode. */
  readonly blend?: BlendMode
  /** Whether the item is mirrored horizontally. Defaults to false. */
  readonly flippedHorizontally?: boolean
  /** Whether the item is mirrored vertically. Defaults to false. */
  readonly flippedVertically?: boolean
}

/** A node that draws two-dimensional content. */
export interface CanvasItemLike {
  readonly modulate: Store<Color>
}

/** A node that clips the items drawn inside it. */
export interface ClippingCanvasItem {
  readonly worldClip: Bounds2
}

/**
 * Base class of the visual nodes.
 *
 * A canvas item owns its transformation, material, tint, order and blend mode,
 * and turns the geometry produced by its subclasses into drawing commands. The
 * material and the tint of the nearest {@link CanvasItem2D} ancestor are
 * inherited, so groups can style their whole subtree.
 */
export abstract class CanvasItem2D extends Node2D implements Drawable {
  /** Material used to draw this item, or undefined to inherit it. */
  public readonly material: Store<GraphicMaterial | undefined>

  /** Color applied to this item and its children. */
  public readonly modulate: Store<Color>

  /** Color applied only to this item. */
  public readonly selfModulate: Store<Color>

  /** Draw order within the space that contains the item. */
  public readonly order: Store<number>

  /** Depth used by spaces that sort back to front. */
  public readonly depth: Store<number>

  /** Blend mode that overrides the material one. */
  public readonly blend: Store<BlendMode | undefined>

  /** Whether the item is mirrored horizontally. */
  public readonly flippedHorizontally: Store<boolean>

  /** Whether the item is mirrored vertically. */
  public readonly flippedVertically: Store<boolean>

  /**
   * @param options - Transformation, material, tint, order, depth and blending.
   */
  public constructor({
    material,
    modulate = Color.white,
    selfModulate = Color.white,
    order = 0,
    depth = 0,
    blend,
    flippedHorizontally = false,
    flippedVertically = false,
    ...options
  }: CanvasItem2DOptions = {}) {
    super(options)
    this.material = new Store<GraphicMaterial | undefined>(material)
    this.modulate = new Store(modulate)
    this.selfModulate = new Store(selfModulate)
    this.order = new Store(order)
    this.depth = new Store(depth)
    this.blend = new Store<BlendMode | undefined>(blend)
    this.flippedHorizontally = new Store(flippedHorizontally)
    this.flippedVertically = new Store(flippedVertically)
  }

  /** Geometry drawn by the default implementation, or undefined when absent. */
  protected get shapeMesh(): GraphicMesh2D | undefined {
    return undefined
  }

  /** Local transformation applied to {@link shapeMesh}. */
  protected get shapeTransform(): Matrix3x2 {
    return Matrix3x2.identity
  }

  private get flipTransform(): Matrix3x2 {
    const x = this.flippedHorizontally.value ? -1 : 1
    const y = this.flippedVertically.value ? -1 : 1
    if (x === 1 && y === 1) return Matrix3x2.identity

    return Matrix3x2.scaling(x, y)
  }

  /** @inheritDoc */
  public draw(_context: DrawContext): DrawData {
    const commands: Draw2DCommand[] = []
    if (!this.destroyed && this.visible.value) this.collectDraw(commands)

    return new DrawData(commands)
  }

  /**
   * Produces the commands of this item.
   *
   * Items that depend on frame state override {@link draw} to prepare it before
   * calling the base implementation.
   *
   * @param commands - Command list that receives the results.
   */
  protected collectDraw(commands: Draw2DCommand[]): void {
    const mesh = this.shapeMesh
    if (mesh === undefined || mesh.destroyed) return
    commands.push(this.createCommand(mesh))
  }

  /**
   * Creates a command that inherits the material, tint and clip of this item.
   *
   * @param mesh - Geometry to draw.
   * @param local - Transformation applied before the flip and node transforms.
   * @param overrides - Material, tint, order, depth, clip or blend for this command.
   * @returns A draw command ready to be collected.
   * @throws {@link Error} If no material is available.
   */
  protected createCommand(
    mesh: GraphicMesh2D,
    local: Matrix3x2 = this.shapeTransform,
    overrides: Partial<
      Pick<Draw2DCommandOptions, 'tint' | 'order' | 'depth' | 'clip' | 'blend' | 'material'>
    > = {},
  ): Draw2DCommand {
    return new Draw2DCommand({
      mesh,
      material: overrides.material ?? this.resolveMaterial(),
      transform: local.multiply(this.flipTransform).multiply(this.globalTransform),
      order: overrides.order ?? this.order.value,
      depth: overrides.depth ?? this.depth.value,
      tint: combine(this.resolveTint(), overrides.tint),
      clip: overrides.clip ?? this.resolveClip(),
      blend: overrides.blend ?? this.blend.value,
    })
  }

  /**
   * Finds the material of this item or of its nearest canvas ancestor.
   *
   * @returns The material used to draw this item.
   * @throws {@link Error} If no material is available.
   */
  protected resolveMaterial(): GraphicMaterial {
    const own = this.material.value
    if (own !== undefined) return own
    let ancestor = this.parent
    while (ancestor !== undefined) {
      if (ancestor instanceof CanvasItem2D) {
        const material = ancestor.material.value
        if (material !== undefined) return material
      }

      ancestor = ancestor.parent
    }

    throw new Error('A canvas item requires a material.')
  }

  /**
   * Combines the modulate of every canvas ancestor with the color of this item.
   *
   * @returns The resulting tint, or undefined when it does not change the colors.
   */
  protected resolveTint(): Color | undefined {
    let color = this.modulate.value.multiply(this.selfModulate.value)
    let ancestor = this.parent
    while (ancestor !== undefined) {
      if (ancestor instanceof CanvasItem2D) color = color.multiply(ancestor.modulate.value)

      ancestor = ancestor.parent
    }

    return isWhite(color) ? undefined : color
  }

  /**
   * Intersects the clipping regions declared by the canvas ancestors.
   *
   * @returns The world rectangle that clips this item, or undefined when unclipped.
   */
  protected resolveClip(): Bounds2 | undefined {
    let clip: Bounds2 | undefined
    let ancestor = this.parent
    while (ancestor !== undefined) {
      if (isClippingItem(ancestor)) {
        clip = clip === undefined ? ancestor.worldClip : intersect(clip, ancestor.worldClip)
      }

      ancestor = ancestor.parent
    }

    return clip
  }
}

function combine(base: Color | undefined, extra: Color | undefined): Color | undefined {
  if (extra === undefined) return base
  if (base === undefined) return isWhite(extra) ? undefined : extra

  return base.multiply(extra)
}

function isWhite(color: Color): boolean {
  return color.r === 1 && color.g === 1 && color.b === 1 && color.a === 1
}

function isClippingItem(node: Node): node is Node & ClippingCanvasItem {
  return 'worldClip' in node && node.worldClip instanceof Bounds2
}

function intersect(left: Bounds2, right: Bounds2): Bounds2 {
  return new Bounds2(
    new Vector2(Math.max(left.min.x, right.min.x), Math.max(left.min.y, right.min.y)),
    new Vector2(Math.min(left.max.x, right.max.x), Math.min(left.max.y, right.max.y)),
  )
}
