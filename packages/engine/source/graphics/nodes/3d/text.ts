import { Store } from '#/core/events/store.js'

import { type Draw3DCommand } from '../../commands/draw3d.js'
import { type GraphicMesh3D } from '../../geometry/mesh3d.js'
import { type Font } from '../../resources/font.js'
import { type GraphicMaterial } from '../../resources/material.js'
import {
  layoutText,
  TextAlignment,
  type TextContent,
  type TextLayout,
  type TextLayoutOptions,
} from '../../text/layout.js'
import { createTextMesh3D, groupQuadsByFont } from '../../text/mesh.js'

import { VisualInstance3D, type VisualInstance3DOptions } from './visual-instance.js'

/** Configuration for a text node in space. */
export interface TextNode3DOptions extends VisualInstance3DOptions, TextLayoutOptions {
  /** Font used to draw the text. */
  readonly font: Font
  /** Text to draw, as a string or as runs with their own font, size and color. */
  readonly text?: TextContent
  /** Materials of the runs drawn with another font, indexed by that font. */
  readonly materials?: Iterable<readonly [Font, GraphicMaterial]>
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
 * the screen. Runs that change font produce their own mesh and command.
 */
export class TextNode3D extends VisualInstance3D {
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

  /** Depth offset of the glyphs from the origin. */
  public readonly depth: Store<number>

  /** Whether the box is centred on the origin. */
  public readonly centered: boolean

  private readonly _materials: Map<Font, GraphicMaterial> = new Map<Font, GraphicMaterial>()
  private readonly _meshes: Map<Font, GraphicMesh3D> = new Map<Font, GraphicMesh3D>()
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

  /** @inheritDoc */
  protected override get shapeMesh(): GraphicMesh3D | undefined {
    const lists = [...this.groups()]

    return lists.length === 1 ? lists[0]?.[1] : undefined
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
  protected override collectDraw(commands: Draw3DCommand[]): void {
    for (const [face, mesh] of this.groups()) {
      commands.push(this.createCommand(mesh, this._materials.get(face)))
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
      this.depth,
    ]) {
      if (!store.destroyed) store.destroy()
    }

    super.onDestroy()
  }

  private groups(): ReadonlyMap<Font, GraphicMesh3D> {
    const inputs: TextInputs = [
      this.text.value,
      this.font.value,
      this.pixelSize.value,
      this.align.value,
      this.wrapWidth.value,
      this.lineSpacing.value,
      this.depth.value,
    ]
    if (sameInputs(this._inputs, inputs)) return this._meshes

    this.disposeMeshes()
    const layout = this.layout
    const shiftX = this.centered ? layout.width / 2 : 0
    const shiftY = this.centered ? layout.height / 2 : 0
    for (const [face, quads] of groupQuadsByFont(layout)) {
      if (quads.length === 0) continue
      const placed: TextLayout = {
        ...layout,
        quads: quads.map((quad) => ({ ...quad, x: quad.x - shiftX, y: quad.y - shiftY })),
      }
      this._meshes.set(face, createTextMesh3D(placed, this.depth.value))
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
type TextInputs = readonly [TextContent, Font, number, TextAlignment, number, number, number]

function sameInputs(previous: TextInputs | undefined, next: TextInputs): boolean {
  if (previous === undefined) return false

  return previous.every((value, index) => value === next[index])
}
