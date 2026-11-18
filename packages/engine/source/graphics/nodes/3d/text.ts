import { Store } from '#/core/events/store.js'

import { type GraphicMesh3D } from '../../geometry/mesh3d.js'
import { type Font } from '../../resources/font.js'
import {
  layoutText,
  TextAlignment,
  type TextContent,
  type TextLayout,
  type TextLayoutOptions,
} from '../../text/layout.js'
import { createTextMesh3D } from '../../text/mesh.js'

import { VisualInstance3D, type VisualInstance3DOptions } from './visual-instance.js'

/** Configuration for a text node in space. */
export interface TextNode3DOptions extends VisualInstance3DOptions, TextLayoutOptions {
  /** Font used to draw the text. */
  readonly font: Font
  /** Text to draw, as a string or as runs with their own font, size and color. */
  readonly text?: TextContent
  /** Depth offset of the glyphs from the origin; defaults to zero. */
  readonly depth?: number
  /** Whether the box is centred on the origin instead of starting at it; defaults to false. */
  readonly centered?: boolean
}

/**
 * A block of text drawn in space, facing positive Z.
 *
 * It lays text out exactly like the two-dimensional node and turns it into
 * geometry in the plane, so the same font draws a label in the world or a HUD on
 * the screen. The geometry is rebuilt only when the text, the font or the layout
 * changes.
 */
export class TextNode3D extends VisualInstance3D {
  /** Text to draw, as a string or as runs with their own font, size and color. */
  public readonly text: Store<TextContent>

  /** Font used to draw the text. */
  public readonly font: Store<Font>

  /** Size the glyphs are drawn at, in world units. */
  public readonly pixelSize: Store<number>

  /** Horizontal alignment of the lines. */
  public readonly align: Store<TextAlignment>

  /** Width the lines wrap at, in world units; zero keeps one line per paragraph. */
  public readonly wrapWidth: Store<number>

  /** Multiplier applied to the line height of the font. */
  public readonly lineSpacing: Store<number>

  /** Depth offset of the glyphs from the origin. */
  public readonly depth: Store<number>

  /** Whether the box is centred on the origin. */
  public readonly centered: boolean

  private _mesh: GraphicMesh3D | undefined
  private _inputs: TextInputs | undefined

  /**
   * @param options - Transformation, material, text, font and layout settings.
   */
  public constructor({
    text = '',
    font,
    pixelSize = font.size,
    align = TextAlignment.left,
    wrapWidth = 0,
    lineSpacing = 1,
    depth = 0,
    centered = false,
    ...options
  }: TextNode3DOptions) {
    super(options)
    this.text = new Store(text)
    this.font = new Store(font)
    this.pixelSize = new Store(pixelSize)
    this.align = new Store(align)
    this.wrapWidth = new Store(wrapWidth)
    this.lineSpacing = new Store(lineSpacing)
    this.depth = new Store(depth)
    this.centered = centered
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

  /** @inheritDoc */
  protected override get shapeMesh(): GraphicMesh3D | undefined {
    const inputs: TextInputs = [
      this.text.value,
      this.font.value,
      this.pixelSize.value,
      this.align.value,
      this.wrapWidth.value,
      this.lineSpacing.value,
      this.depth.value,
    ]
    if (this._mesh === undefined || !sameInputs(this._inputs, inputs)) {
      if (this._mesh !== undefined && !this._mesh.destroyed) this._mesh.destroy()
      const layout = this.layout
      const offset = this.centered ? layout.width / 2 : 0
      this._mesh =
        layout.quads.length === 0
          ? undefined
          : createTextMesh3D(
              offset === 0 ? layout : shiftLayout(layout, offset, layout.height / 2),
              this.depth.value,
            )
      this._inputs = inputs
    }

    return this._mesh
  }

  protected override onDestroy(): void {
    if (this._mesh !== undefined && !this._mesh.destroyed) this._mesh.destroy()
    for (const store of [
      this.text,
      this.font,
      this.pixelSize,
      this.align,
      this.wrapWidth,
      this.lineSpacing,
      this.depth,
    ]) {
      if (!store.destroyed) store.destroy()
    }

    super.onDestroy()
  }
}

/** Values the geometry of a text node depends on. */
type TextInputs = readonly [TextContent, Font, number, TextAlignment, number, number, number]

function sameInputs(previous: TextInputs | undefined, next: TextInputs): boolean {
  if (previous === undefined) return false

  return previous.every((value, index) => value === next[index])
}

function shiftLayout(layout: TextLayout, x: number, y: number): TextLayout {
  return {
    ...layout,
    quads: layout.quads.map((quad) => ({ ...quad, x: quad.x - x, y: quad.y - y })),
  }
}
