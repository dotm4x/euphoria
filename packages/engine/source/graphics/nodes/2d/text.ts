import { Store } from '#/core/events/store.js'
import { Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'

import { type Draw2DCommand } from '../../commands/draw2d.js'
import { type GraphicMesh2D } from '../../geometry/mesh2d.js'
import { type Font } from '../../resources/font.js'
import { type GraphicMaterial } from '../../resources/material.js'
import {
  layoutText,
  TextAlignment,
  type TextContent,
  type TextLayout,
  type TextLayoutOptions,
} from '../../text/layout.js'
import { createTextMesh2D, groupQuadsByFont } from '../../text/mesh.js'

import { CanvasItem2D, type CanvasItem2DOptions } from './canvas-item.js'

/** Configuration for a text node. */
export interface TextNodeOptions extends CanvasItem2DOptions, TextLayoutOptions {
  /** Font used to draw the text. */
  readonly font: Font
  /** Text to draw, as a string or as runs with their own font, size and color. */
  readonly text?: TextContent
  /** Materials of the runs drawn with another font, indexed by that font. */
  readonly materials?: Iterable<readonly [Font, GraphicMaterial]>
  /** Whether the box is centred on the origin instead of starting at it; defaults to false. */
  readonly centered?: boolean
}

/**
 * A block of text drawn with one or more font atlases.
 *
 * The origin of the node is the top-left corner of the box and the vertical axis
 * grows downwards. Runs that change font produce their own mesh and their own
 * command, because a material samples a single atlas; runs that only change size
 * or color stay in one mesh.
 */
export class TextNode extends CanvasItem2D {
  /** Text to draw, as a string or as runs with their own font, size and color. */
  public readonly text: Store<TextContent>

  /** Font used to draw the runs that do not declare one. */
  public readonly font: Store<Font>

  /** Size the glyphs are drawn at, in world units. */
  public readonly pixelSize: Store<number>

  /** Horizontal alignment of the lines. */
  public readonly align: Store<TextAlignment>

  /** Width the lines wrap at, in world units; zero keeps one line per paragraph. */
  public readonly wrapWidth: Store<number>

  /** Multiplier applied to the line height of the font. */
  public readonly lineSpacing: Store<number>

  /** Whether the box is centred on the origin. */
  public readonly centered: boolean

  private readonly _materials: Map<Font, GraphicMaterial> = new Map<Font, GraphicMaterial>()
  private readonly _meshes: Map<Font, GraphicMesh2D> = new Map<Font, GraphicMesh2D>()
  private _inputs: TextInputs | undefined

  /**
   * @param options - Transformation, material, text, font and layout settings.
   */
  public constructor({
    text = '',
    font,
    materials = [],
    pixelSize = font.size,
    align = TextAlignment.left,
    wrapWidth = 0,
    lineSpacing = 1,
    centered = false,
    ...options
  }: TextNodeOptions) {
    super(options)
    this.text = new Store(text)
    this.font = new Store(font)
    this.pixelSize = new Store(pixelSize)
    this.align = new Store(align)
    this.wrapWidth = new Store(wrapWidth)
    this.lineSpacing = new Store(lineSpacing)
    this.centered = centered
    for (const [face, material] of materials) this._materials.set(face, material)
  }

  /** Text placed in world units, as the node currently draws it. */
  public get layout(): TextLayout {
    return layoutText(this.font.value, this.text.value, {
      align: this.align.value,
      pixelSize: this.pixelSize.value,
      lineSpacing: this.lineSpacing.value,
      ...(this.wrapWidth.value === 0 ? {} : { wrapWidth: this.wrapWidth.value }),
    })
  }

  /** Width of the laid out text, in world units. */
  public get width(): number {
    return this.layout.width
  }

  /** Height of the laid out text, in world units. */
  public get height(): number {
    return this.layout.height
  }

  /** @inheritDoc */
  protected override get shapeMesh(): GraphicMesh2D | undefined {
    const lists = [...this.groups()]

    return lists.length === 1 ? lists[0]?.[1] : undefined
  }

  /** @inheritDoc */
  protected override get shapeTransform(): Matrix3x2 {
    if (!this.centered) return Matrix3x2.identity
    const { width, height } = this.layout

    return Matrix3x2.translation(-width / 2, -height / 2)
  }

  /**
   * Registers the material of a font a run may draw with.
   *
   * @param face - Font the material draws.
   * @param material - Material bound to that font atlas.
   */
  public setMaterial(face: Font, material: GraphicMaterial): void {
    this._materials.set(face, material)
  }

  /** @inheritDoc */
  protected override collectDraw(commands: Draw2DCommand[]): void {
    const meshes = this.groups()
    for (const [face, mesh] of meshes) {
      const material = this._materials.get(face)
      commands.push(
        this.createCommand(mesh, this.shapeTransform, material === undefined ? {} : { material }),
      )
    }
  }

  protected override onDestroy(): void {
    this.disposeMeshes()
    for (const store of [
      this.text,
      this.font,
      this.pixelSize,
      this.align,
      this.wrapWidth,
      this.lineSpacing,
    ]) {
      if (!store.destroyed) store.destroy()
    }

    super.onDestroy()
  }

  private groups(): ReadonlyMap<Font, GraphicMesh2D> {
    const inputs: TextInputs = [
      this.text.value,
      this.font.value,
      this.pixelSize.value,
      this.align.value,
      this.wrapWidth.value,
      this.lineSpacing.value,
    ]
    if (sameInputs(this._inputs, inputs)) return this._meshes

    this.disposeMeshes()
    const layout = this.layout
    for (const [face, quads] of groupQuadsByFont(layout)) {
      if (quads.length === 0) continue
      this._meshes.set(face, createTextMesh2D(layout, quads))
    }

    this._inputs = inputs

    return this._meshes
  }

  private disposeMeshes(): void {
    for (const mesh of this._meshes.values()) {
      if (!mesh.destroyed) mesh.destroy()
    }

    this._meshes.clear()
    this._inputs = undefined
  }
}

/** Values the geometry of a text node depends on. */
type TextInputs = readonly [TextContent, Font, number, TextAlignment, number, number]

function sameInputs(previous: TextInputs | undefined, next: TextInputs): boolean {
  if (previous === undefined) return false

  return previous.every((value, index) => value === next[index])
}
