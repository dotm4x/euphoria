import { Store } from '#/core/events/store.js'
import { collectNodeCommands } from '#/graphics/traversal.js'
import { Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { ClearCommand } from '../commands/clear.js'
import { type DrawCommand } from '../commands/command.js'
import { type DrawData } from '../data.js'
import { type GraphicMesh2D } from '../geometry/mesh2d.js'
import { unitQuadMesh } from '../geometry/quad.js'
import { type DrawContext } from '../interfaces/context.js'
import { type RenderContainer } from '../interfaces/render-container.js'
import { Color } from '../primitives/color.js'
import { Viewport } from '../primitives/viewport.js'
import { type GraphicMaterial } from '../resources/material.js'
import { RenderTarget } from '../resources/targets/target.js'

import { CanvasItem2D, type CanvasItem2DOptions } from './canvas-item.js'

/** Configuration for a viewport node. */
export interface ViewportNodeOptions extends CanvasItem2DOptions {
  /** Size of the offscreen target, in pixels. */
  readonly size: Vector2
  /** Factory that creates the material sampling the offscreen target. */
  readonly createMaterial: (target: RenderTarget) => GraphicMaterial
  /** Color used to clear the target. Defaults to transparent black. */
  readonly clearColor?: Color
  /** Samples drawn per target pixel. Defaults to 4. */
  readonly sampleCount?: number
  /**
   * Whether the target receives a depth buffer, required for three-dimensional
   * contents. Defaults to false.
   */
  readonly depthBuffer?: boolean
}

/**
 * A node that draws its children into an offscreen target and samples it.
 *
 * The children are rendered with the camera of the frame into a target of a
 * fixed size, then the target is drawn as a quad of the same size. The space
 * does not traverse the children of this node, because it renders them itself.
 */
export class ViewportNode extends CanvasItem2D implements RenderContainer {
  private readonly _target: RenderTarget
  private readonly _material: GraphicMaterial
  private readonly _clearColor: Color
  private readonly _size: Store<Vector2>

  /**
   * @param options - Target size, material factory, clear color and samples.
   */
  public constructor({
    size,
    createMaterial,
    clearColor = new Color(0, 0, 0, 0),
    sampleCount = 4,
    depthBuffer = false,
    ...options
  }: ViewportNodeOptions) {
    super(options)
    this._size = new Store(size)
    this._clearColor = clearColor
    this._target = new RenderTarget(size, { sampleCount, depth: depthBuffer })
    this._material = createMaterial(this._target)
    this.material.value = this._material
  }

  /** Offscreen target that receives the contents of the viewport. */
  public get target(): RenderTarget {
    return this._target
  }

  /** Size of the offscreen target, in pixels. */
  public get size(): Vector2 {
    return this._size.value
  }

  /** @inheritDoc */
  protected override get shapeMesh(): GraphicMesh2D {
    return unitQuadMesh
  }

  /** @inheritDoc */
  protected override get shapeTransform(): Matrix3x2 {
    const size = this.size

    return Matrix3x2.scaling(size.x, size.y)
  }

  /**
   * The viewport renders its own children in {@link draw}, so the node
   * traversal must not collect them again.
   *
   * @returns An empty list.
   */
  public collectChildren(_context: DrawContext): DrawCommand[] {
    return []
  }

  /** @inheritDoc */
  public override draw(context: DrawContext): DrawData {
    const sink = context.sink
    if (sink === undefined) {
      throw new Error('A viewport node requires a drawing sink.')
    }

    const nested: DrawCommand[] = []
    const nestedContext: DrawContext = {
      camera: context.camera,
      deltaTime: context.deltaTime,
      viewport: new Viewport(new Vector2(0, 0), this._target.size),
      sink,
    }
    for (const child of [...this.children]) collectNodeCommands(child, nestedContext, nested)
    sink.render([new ClearCommand(this._clearColor)], undefined, this._target)
    sink.render(nested, nestedContext, this._target)

    return super.draw(context)
  }

  protected override onDestroy(): void {
    if (!this._material.destroyed) this._material.destroy()
    if (!this._target.destroyed) this._target.destroy()
    if (!this._size.destroyed) this._size.destroy()
    super.onDestroy()
  }
}
