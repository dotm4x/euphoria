import {
  Camera2D,
  Color,
  type Font,
  type GraphicMaterial,
  Node2D,
  RectNode,
  TextAlignment,
  type TextContent,
  TextNode,
  type Updatable,
  type UpdateContext,
  Vector2,
} from '@euphoria/engine'

/** Width of one of the two columns, in world units. */
const column = 292

/** Space between the two columns. */
const gutter = 16

/** Margin between the canvas edge and the panels. */
const margin = 16

/** Padding inside each panel. */
const padding = 14

/** Configuration for the text scene. */
export interface TextSceneOptions {
  /** Font used for the body of the samples. */
  readonly font: Font
  /** Bold face of {@link font}, used by the run sample. */
  readonly boldFont: Font
  /** Pixel font used for the title. */
  readonly headingFont: Font
  /** Material the body font is drawn with. */
  readonly material: GraphicMaterial
  /** Material the bold font is drawn with. */
  readonly boldMaterial: GraphicMaterial
  /** Material the pixel font is drawn with. */
  readonly headingMaterial: GraphicMaterial
  /** Material of the panels behind the text. */
  readonly panel: GraphicMaterial
}

/**
 * Shows what a font can do, with every block inside its panel.
 *
 * Two columns share the canvas: wrapping and sizes on the left, the three
 * alignments on the right. Panels are placed from the canvas size and the text
 * from the height each block reports, so a longer sample pushes the next one
 * down instead of overlapping it.
 */
export class TextScene extends Node2D implements Updatable {
  public readonly camera: Camera2D

  private readonly _counter: TextNode
  private readonly _material: GraphicMaterial
  private readonly _boldMaterial: GraphicMaterial
  private readonly _headingMaterial: GraphicMaterial
  private _elapsed: number = 0

  /**
   * @param options - Fonts and materials of the samples.
   */
  public constructor({
    font,
    boldFont,
    headingFont,
    material,
    boldMaterial,
    headingMaterial,
    panel,
  }: TextSceneOptions) {
    const camera = new Camera2D({ name: 'camera' })
    const titleY = -180 + margin
    const panelTop = -98
    const panelBottom = 138
    const panelHeight = panelBottom - panelTop
    const left = -320 + margin
    const right = left + column + gutter
    const panelColor = new Color(0.085, 0.1, 0.14, 1)
    const borderColor = new Color(0.16, 0.2, 0.28, 1)
    const accent = new Color(0.5, 0.85, 1, 1)
    const muted = new Color(0.55, 0.6, 0.7, 1)

    const title = new TextNode({
      name: 'title',
      font: headingFont,
      material: headingMaterial,
      text: 'EUPHORIA',
      pixelSize: 26,
      position: new Vector2(left, titleY),
      modulate: accent,
    })
    const subtitle = new TextNode({
      name: 'subtitle',
      font,
      material,
      text: 'one raster per font, laid out per node',
      pixelSize: 13,
      position: new Vector2(left + title.width + 18, titleY + title.height - 18),
      modulate: muted,
    })

    const wrappingLabel = new TextNode({
      name: 'wrapping-label',
      font: headingFont,
      material: headingMaterial,
      text: 'WRAPPING',
      pixelSize: 10,
      position: new Vector2(left + padding, panelTop + padding),
      modulate: accent,
    })
    const paragraph = new TextNode({
      name: 'paragraph',
      font,
      material,
      text: 'A paragraph wraps where it is told to and breaks between words. The whole block is one mesh.',
      pixelSize: 15,
      lineSpacing: 1.05,
      wrapWidth: column - padding * 2,
      position: new Vector2(left + padding, 0),
      modulate: new Color(0.9, 0.92, 0.96, 1),
    })

    const sizes = [
      { size: 12, text: 'twelve pixels', tint: new Color(0.75, 0.85, 0.65, 1) },
      { size: 16, text: 'sixteen pixels', tint: new Color(0.75, 0.87, 0.75, 1) },
      { size: 22, text: 'twenty-two pixels', tint: new Color(0.75, 0.9, 0.85, 1) },
    ].map(({ size, text, tint }) => {
      const node = new TextNode({
        name: `size-${String(size)}`,
        font,
        material,
        text,
        pixelSize: size,
        position: new Vector2(left + padding, 0),
        modulate: tint,
      })

      return { node, size }
    })

    const alignmentLabel = new TextNode({
      name: 'alignment-label',
      font: headingFont,
      material: headingMaterial,
      text: 'ALIGNMENT',
      pixelSize: 10,
      position: new Vector2(right + padding, panelTop + padding),
      modulate: accent,
    })
    const centered = new TextNode({
      name: 'centered',
      font,
      material,
      text: 'centred in its box',
      pixelSize: 17,
      align: TextAlignment.center,
      wrapWidth: column - padding * 2,
      position: new Vector2(right + padding, 0),
      modulate: new Color(0.45, 0.9, 0.6, 1),
    })
    const alignedRight = new TextNode({
      name: 'right',
      font,
      material,
      text: 'right aligned\nand a second line',
      pixelSize: 15,
      align: TextAlignment.right,
      wrapWidth: column - padding * 2,
      position: new Vector2(right + padding, 0),
      modulate: new Color(0.98, 0.75, 0.4, 1),
    })
    const alignedLeft = new TextNode({
      name: 'left',
      font,
      material,
      text: 'left aligned, the default',
      pixelSize: 15,
      wrapWidth: column - padding * 2,
      position: new Vector2(right + padding, 0),
      modulate: new Color(0.85, 0.87, 0.92, 1),
    })
    const note = new TextNode({
      name: 'runs',
      font,
      material,
      text: [
        { text: 'runs mix ' },
        { text: 'regular' },
        { text: ', ' },
        { text: 'bold', font: boldFont, color: new Color(0.5, 0.85, 1, 1) },
        { text: ' and ' },
        { text: 'colour', color: new Color(0.98, 0.75, 0.4, 1) },
        { text: ' on the same line' },
      ],
      pixelSize: 13,
      lineSpacing: 1.3,
      wrapWidth: column - padding * 2,
      position: new Vector2(right + padding, 0),
      modulate: new Color(0.9, 0.92, 0.96, 1),
    })

    const counterPanel = new RectNode({
      material: panel,
      size: new Vector2(120, 26),
      position: new Vector2(320 - margin - 60, 164 - 13),
      selfModulate: new Color(0.11, 0.13, 0.18, 1),
    })
    const counter = new TextNode({
      name: 'counter',
      font,
      material,
      text: '0.0 s',
      pixelSize: 15,
      align: TextAlignment.right,
      wrapWidth: 120 - padding,
      position: new Vector2(320 - margin - 120 + padding / 2, 164 - 13 - 8),
      modulate: new Color(0.8, 0.85, 1, 1),
    })

    super({
      name: 'text',
      children: [
        new RectNode({
          material: panel,
          size: new Vector2(column + 2, panelHeight + 2),
          position: new Vector2(left + column / 2, panelTop + panelHeight / 2),
          selfModulate: borderColor,
        }),
        new RectNode({
          material: panel,
          size: new Vector2(column, panelHeight),
          position: new Vector2(left + column / 2, panelTop + panelHeight / 2),
          selfModulate: panelColor,
        }),
        new RectNode({
          material: panel,
          size: new Vector2(column + 2, panelHeight + 2),
          position: new Vector2(right + column / 2, panelTop + panelHeight / 2),
          selfModulate: borderColor,
        }),
        new RectNode({
          material: panel,
          size: new Vector2(column, panelHeight),
          position: new Vector2(right + column / 2, panelTop + panelHeight / 2),
          selfModulate: panelColor,
        }),
        camera,
        title,
        subtitle,
        wrappingLabel,
        paragraph,
        ...sizes.map(({ node }) => node),
        alignmentLabel,
        centered,
        alignedRight,
        alignedLeft,
        note,
        counterPanel,
        counter,
      ],
    })

    // Each block starts below the previous one, using the height it measured.
    const offset = (node: TextNode, y: number): void => {
      node.position.value = new Vector2(node.position.value.x, y)
    }

    let leftY = wrappingLabel.position.value.y + wrappingLabel.height + 8
    offset(paragraph, leftY)
    leftY += paragraph.height + 14
    for (const entry of sizes) {
      offset(entry.node, leftY)
      leftY += entry.node.height + 4
    }

    let rightY = alignmentLabel.position.value.y + alignmentLabel.height + 8
    for (const block of [centered, alignedRight, alignedLeft, note]) {
      offset(block, rightY)
      rightY += block.height + 10
    }

    this.camera = camera
    this._counter = counter
    this._material = material
    this._boldMaterial = boldMaterial
    this._headingMaterial = headingMaterial
  }

  /** @inheritDoc */
  public update({ deltaTime }: UpdateContext): void {
    this._elapsed += deltaTime
    this._counter.text.value = `${this._elapsed.toFixed(1)} s`
  }

  /** Values the statistics panel shows for this scene. */
  public readouts(): Iterable<readonly [string, string]> {
    return [['Counter', textOf(this._counter.text.value)]]
  }

  protected override onDestroy(): void {
    super.onDestroy()
    if (!this._material.destroyed) this._material.destroy()
    if (!this._boldMaterial.destroyed) this._boldMaterial.destroy()
    if (!this._headingMaterial.destroyed) this._headingMaterial.destroy()
  }
}

function textOf(content: TextContent): string {
  if (typeof content === 'string') return content

  return content.map((run) => run.text).join('')
}
