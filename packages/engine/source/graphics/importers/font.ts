import { fetchSource } from '#/modules/assets/helpers/fetch.js'
import { AssetImporter, type ImportedAsset } from '#/modules/assets/importer.js'

import { Font, GlyphMetrics } from '../resources/font.js'
import { Image, RasterImageFormat } from '../resources/image.js'
import { type GlyphBox, packGlyphs } from '../text/atlas.js'

/** Characters a font rasterizes by default: printable ASCII. */
const printableAscii = Array.from({ length: 95 }, (_, index) => String.fromCharCode(index + 32))

/** Configuration for the font importer. */
export interface FontImporterOptions {
  /** Design size the glyphs are rasterized at, in pixels; defaults to `48`. */
  readonly size?: number
  /** Characters to rasterize, in addition to `\n` and a space. Defaults to printable ASCII. */
  readonly characters?: string
  /** Maximum width of the atlas, in pixels; defaults to `1024`. */
  readonly maxAtlasWidth?: number
  /** Family name the browser registers the font under; defaults to the source. */
  readonly family?: string
  /** Weight of the face, from `1` to `1000`; defaults to `400`. */
  readonly weight?: number
  /** Character drawn for glyphs the font does not have; defaults to `?`. */
  readonly fallback?: string
}

/**
 * Rasterizes a font file into glyph bitmaps and metrics.
 *
 * Supports TTF, OTF, WOFF and WOFF2. The font is loaded through `FontFace` and
 * drawn into a canvas once, so playing a game never touches the text rasterizer
 * again: the atlas becomes an image the renderer uploads as a texture.
 *
 * Layout is not done here. The importer measures the glyphs the browser draws
 * and leaves them in an atlas; placing them along a line is up to the text nodes.
 */
export class FontImporter extends AssetImporter<Font> {
  private readonly _options: FontImporterOptions

  /**
   * @param options - Design size, characters and atlas size of the raster.
   */
  public constructor(options: FontImporterOptions = {}) {
    super({ identifier: 'font', extensions: ['ttf', 'otf', 'woff', 'woff2'] })
    this._options = options
  }

  /** @inheritDoc */
  public override async load(source: string, signal: AbortSignal): Promise<ImportedAsset<Font>> {
    const {
      size = 48,
      characters,
      maxAtlasWidth = 1024,
      family,
      weight = 400,
      fallback,
    } = this._options
    const response = await fetchSource(source, signal)
    const bytes = await response.arrayBuffer()
    signal.throwIfAborted()

    const name = family ?? `euphoria-${source}`
    const face = new FontFace(name, bytes, { weight: String(weight) })
    await face.load()
    signal.throwIfAborted()
    document.fonts.add(face)

    const glyphs = Array.from(
      new Set([...Array.from(characters ?? printableAscii), ' ', fallback ?? '?']),
    )
    const raster = rasterizeGlyphs(name, size, weight, glyphs, maxAtlasWidth)
    signal.throwIfAborted()

    return {
      value: new Font({
        family: name,
        size,
        ...raster,
        ...(fallback === undefined ? {} : { fallback }),
      }),
    }
  }
}

/** Bitmaps and metrics produced by one raster pass. */
interface RasterizedFont {
  readonly atlas: Image
  readonly glyphs: readonly GlyphMetrics[]
  readonly lineHeight: number
  readonly ascent: number
  readonly descent: number
}

/**
 * Draws every character into one canvas and measures it.
 *
 * @param family - Family the browser registered the font under.
 * @param size - Design size of the raster, in pixels.
 * @param weight - Weight of the face, from `1` to `1000`.
 * @param characters - Characters to rasterize.
 * @param maxAtlasWidth - Maximum width of the atlas, in pixels.
 * @returns The atlas, the glyphs and the vertical metrics of the font.
 */
function rasterizeGlyphs(
  family: string,
  size: number,
  weight: number,
  characters: readonly string[],
  maxAtlasWidth: number,
): RasterizedFont {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (context === null) {
    throw new Error('Fonts cannot be rasterized without a two-dimensional canvas.')
  }

  const font = `${String(weight)} ${String(size)}px "${family}"`
  context.font = font
  context.textBaseline = 'alphabetic'
  context.textAlign = 'left'

  const bounds = characters.map((character) => ({ character, ...measureGlyph(context, character) }))
  const boxes: GlyphBox[] = bounds.map(({ character, width, height }) => ({
    character,
    width,
    height,
  }))
  const packed = packGlyphs(boxes, { maxWidth: maxAtlasWidth, padding: 1 })

  canvas.width = packed.width
  canvas.height = packed.height
  context.font = font
  context.textBaseline = 'alphabetic'
  context.textAlign = 'left'
  context.fillStyle = '#ffffff'

  const glyphs: GlyphMetrics[] = []
  for (const glyph of bounds) {
    const place = packed.glyphs.get(glyph.character)
    if (place === undefined) continue
    if (glyph.width > 0 && glyph.height > 0) {
      context.fillText(glyph.character, place.x + glyph.left, place.y + glyph.top)
    }

    glyphs.push(
      new GlyphMetrics({
        character: glyph.character,
        advance: glyph.advance,
        left: glyph.left,
        top: glyph.top,
        width: place.width,
        height: place.height,
        u0: place.x / packed.width,
        v0: place.y / packed.height,
        u1: (place.x + place.width) / packed.width,
        v1: (place.y + place.height) / packed.height,
      }),
    )
  }

  const pixels = context.getImageData(0, 0, packed.width, packed.height)
  const vertical = measureVertical(context)
  canvas.remove()

  return {
    atlas: new Image(
      packed.width,
      packed.height,
      new Uint8Array(pixels.data.buffer.slice(0)),
      RasterImageFormat.rgba8Srgb,
    ),
    glyphs,
    ...vertical,
  }
}

/** Metrics of one glyph, in pixels at the design size. */
interface GlyphBounds {
  readonly advance: number
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

function measureGlyph(context: CanvasRenderingContext2D, character: string): GlyphBounds {
  const metrics = context.measureText(character)
  const left = Math.max(0, Math.ceil(metrics.actualBoundingBoxLeft))
  const right = Math.max(0, Math.ceil(metrics.actualBoundingBoxRight))
  const top = Math.max(0, Math.ceil(metrics.actualBoundingBoxAscent))
  const bottom = Math.max(0, Math.ceil(metrics.actualBoundingBoxDescent))

  return {
    advance: metrics.width,
    left,
    top,
    width: Math.max(1, left + right),
    height: Math.max(1, top + bottom),
  }
}

function measureVertical(context: CanvasRenderingContext2D): {
  readonly lineHeight: number
  readonly ascent: number
  readonly descent: number
} {
  const metrics = context.measureText('Hg')
  const ascent = Math.ceil(metrics.fontBoundingBoxAscent)
  const descent = Math.ceil(metrics.fontBoundingBoxDescent)

  return { lineHeight: ascent + descent, ascent, descent }
}

/**
 * Whether this environment can rasterize fonts.
 *
 * @param value - Global object to inspect.
 * @returns Whether the DOM needed by the importer is available.
 */
export function supportsFontRasterization(value: unknown = globalThis): boolean {
  if (typeof value !== 'object' || value === null) return false

  return 'document' in value && 'FontFace' in value
}
