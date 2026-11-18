import { Store } from '#/core/events/store.js'
import { Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'

import { type GraphicMesh2D } from '../../geometry/mesh2d.js'
import { type Font } from '../../resources/font.js'
import {
  layoutText,
  TextAlignment,
  type TextContent,
  type TextLayout,
  type TextLayoutOptions,
} from '../../text/layout.js'
import { createTextMesh2D } from '../../text/mesh.js'

import { CanvasItem2D, type CanvasItem2DOptions } from './canvas-item.js'

/** Configuration for a text node. */
export interface TextNodeOptions extends CanvasItem2DOptions, TextLayoutOptions {
  /** Font used to draw the text. */
  readonly font: Font
  /** Text to draw, as a string or as runs with their own font, size and color. */
  readonly text?: TextContent
  /** Whether the box is centred on the origin instead of starting at it; defaults to false. */
  readonly centered?: boolean
}

/**
 * A block of text drawn with a font atlas.
 *
 * The origin of the node is the top-left corner of the box and the vertical axis
 * grows downwards. The geometry only changes when the text, the font or the
 * layout does, so a static label costs one mesh and a score rebuilt every frame
 * costs one mesh per change.
 */
export class TextNode extends CanvasItem2D {
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

  /** Whether the box is centred on the origin. */
  public readonly centered: boolean

  private _mesh: GraphicMesh2D | undefined
  private _inputs: TextInputs | undefined

  /**
   * @param options - Transformation, material, text, font and layout settings.
   * @throws {@link RangeError} If a layout setting is invalid.
   */
  public constructor({
    text = '',
    font,
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
    const inputs: TextInputs = [
      this.text.value,
      this.font.value,
      this.pixelSize.value,
      this.align.value,
      this.wrapWidth.value,
      this.lineSpacing.value,
    ]
    if (this._mesh === undefined || !sameInputs(this._inputs, inputs)) {
      if (this._mesh !== undefined && !this._mesh.destroyed) this._mesh.destroy()
      const layout = this.layout
      this._mesh = layout.quads.length === 0 ? undefined : createTextMesh2D(layout)
      this._inputs = inputs
    }

    return this._mesh
  }

  /** @inheritDoc */
  protected override get shapeTransform(): Matrix3x2 {
    if (!this.centered) return Matrix3x2.identity
    const { width, height } = this.layout

    return Matrix3x2.translation(-width / 2, -height / 2)
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
    ]) {
      if (!store.destroyed) store.destroy()
    }

    super.onDestroy()
  }
}

/** Values the geometry of a text node depends on. */
type TextInputs = readonly [TextContent, Font, number, TextAlignment, number, number]

function sameInputs(previous: TextInputs | undefined, next: TextInputs): boolean {
  if (previous === undefined) return false

  return previous.every((value, index) => value === next[index])
}
