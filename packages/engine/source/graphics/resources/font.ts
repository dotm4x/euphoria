import { Resource } from '#/core/primitives/resource.js'

import { type Image } from './image.js'

/** Configuration for one glyph of a font. */
export interface GlyphMetricsOptions {
  /** Character the glyph draws; it can be more than one code unit. */
  readonly character: string
  /** Distance the pen advances after the glyph, in font units. */
  readonly advance: number
  /** Distance from the pen to the left of the bitmap, positive to the left. */
  readonly left: number
  /** Distance from the baseline to the top of the bitmap, positive upwards. */
  readonly top: number
  /** Width of the glyph bitmap, in font units. */
  readonly width: number
  /** Height of the glyph bitmap, in font units. */
  readonly height: number
  /** Normalized left edge of the glyph in the atlas. */
  readonly u0: number
  /** Normalized top edge of the glyph in the atlas. */
  readonly v0: number
  /** Normalized right edge of the glyph in the atlas. */
  readonly u1: number
  /** Normalized bottom edge of the glyph in the atlas. */
  readonly v1: number
}

/**
 * Place and size of one glyph, in font units.
 *
 * A glyph with no bitmap, such as a space, has zero width and height and only
 * advances the pen.
 */
export class GlyphMetrics {
  /** Character the glyph draws. */
  public readonly character: string

  /** Distance the pen advances after the glyph. */
  public readonly advance: number

  /** Distance from the pen to the left of the bitmap, positive to the left. */
  public readonly left: number

  /** Distance from the baseline to the top of the bitmap, positive upwards. */
  public readonly top: number

  /** Width of the glyph bitmap. */
  public readonly width: number

  /** Height of the glyph bitmap. */
  public readonly height: number

  /** Normalized left edge of the glyph in the atlas. */
  public readonly u0: number

  /** Normalized top edge of the glyph in the atlas. */
  public readonly v0: number

  /** Normalized right edge of the glyph in the atlas. */
  public readonly u1: number

  /** Normalized bottom edge of the glyph in the atlas. */
  public readonly v1: number

  /**
   * @param options - Character, metrics and atlas coordinates of the glyph.
   * @throws {@link Error} If the character is empty.
   * @throws {@link RangeError} If a metric is not finite or a coordinate is outside the atlas.
   */
  public constructor({
    character,
    advance,
    left,
    top,
    width,
    height,
    u0,
    v0,
    u1,
    v1,
  }: GlyphMetricsOptions) {
    if (character.length === 0) {
      throw new Error('A glyph must describe at least one character.')
    }

    for (const value of [advance, left, top, width, height, u0, v0, u1, v1]) {
      if (!Number.isFinite(value)) {
        throw new RangeError(`Glyph '${character}' has a nonfinite metric.`)
      }
    }

    if (u0 < 0 || v0 < 0 || u1 > 1 || v1 > 1) {
      throw new RangeError(`Glyph '${character}' is outside its atlas.`)
    }

    this.character = character
    this.advance = advance
    this.left = left
    this.top = top
    this.width = width
    this.height = height
    this.u0 = u0
    this.v0 = v0
    this.u1 = u1
    this.v1 = v1
  }
}

/** Configuration for a font. */
export interface FontOptions {
  /** Family the font was rasterized from, used in diagnostics. */
  readonly family: string
  /** Design size the glyphs were rasterized at, in pixels. */
  readonly size: number
  /** Height of one line, in font units. */
  readonly lineHeight: number
  /** Distance from the top of a line to its baseline, in font units. */
  readonly ascent: number
  /** Distance from the baseline to the bottom of a line, in font units. */
  readonly descent: number
  /** Glyph bitmaps the font draws with; the font owns and destroys it. */
  readonly atlas: Image
  /** Glyphs of the font, indexed by character. */
  readonly glyphs: Iterable<GlyphMetrics>
  /** Extra space added between glyphs, in font units; defaults to zero. */
  readonly tracking?: number
  /** Weight of the face, from `1` to `1000`; defaults to `400`. */
  readonly weight?: number
  /** Character drawn for glyphs the font does not have; defaults to `?`. */
  readonly fallback?: string | undefined
}

/**
 * A font ready to draw: metrics, glyph bitmaps and where they live.
 *
 * The font is a resource of the engine, not of the renderer: it holds the atlas
 * as pixel data and the metrics as plain values, so a text node lays text out
 * without a device. The renderer turns the atlas into a texture when a material
 * binds it.
 */
export class Font extends Resource {
  /** Family the font was rasterized from. */
  public readonly family: string

  /** Design size the glyphs were rasterized at, in pixels. */
  public readonly size: number

  /** Height of one line, in font units. */
  public readonly lineHeight: number

  /** Distance from the top of a line to its baseline, in font units. */
  public readonly ascent: number

  /** Distance from the baseline to the bottom of a line, in font units. */
  public readonly descent: number

  /** Glyph bitmaps, as pixel data. */
  public readonly atlas: Image

  /** Extra space added between glyphs, in font units. */
  public readonly tracking: number

  /** Weight of the face, from `1` to `1000`, where `400` is regular and `700` bold. */
  public readonly weight: number

  /** Character drawn for glyphs the font does not have. */
  public readonly fallback: string | undefined

  private readonly _glyphs: ReadonlyMap<string, GlyphMetrics>

  /**
   * @param options - Family, metrics, atlas and glyphs of the font.
   * @throws {@link Error} If the family is empty or a glyph is repeated.
   * @throws {@link RangeError} If a metric is not finite or the design size is not positive.
   */
  public constructor({
    family,
    size,
    lineHeight,
    ascent,
    descent,
    atlas,
    glyphs,
    tracking = 0,
    weight = 400,
    fallback = '?',
  }: FontOptions) {
    super()
    if (!family.trim()) {
      throw new Error('A font family must not be empty.')
    }

    if (!Number.isFinite(size) || size <= 0) {
      throw new RangeError('A font design size must be finite and positive.')
    }

    for (const value of [lineHeight, ascent, descent, tracking]) {
      if (!Number.isFinite(value)) {
        throw new RangeError(`Font '${family}' has a nonfinite metric.`)
      }
    }

    if (!Number.isInteger(weight) || weight < 1 || weight > 1000) {
      throw new RangeError(`Font '${family}' must have a weight between 1 and 1000.`)
    }

    const indexed = new Map<string, GlyphMetrics>()
    for (const glyph of glyphs) {
      if (indexed.has(glyph.character)) {
        throw new Error(`Font '${family}' declares glyph '${glyph.character}' more than once.`)
      }

      indexed.set(glyph.character, glyph)
    }

    this.family = family
    this.size = size
    this.lineHeight = lineHeight
    this.ascent = ascent
    this.descent = descent
    this.atlas = atlas
    this.tracking = tracking
    this.weight = weight
    this.fallback = fallback
    this._glyphs = indexed
  }

  /** Characters the font can draw with their own glyph. */
  public get characters(): readonly string[] {
    return [...this._glyphs.keys()]
  }

  /** Glyph drawn for characters the font does not have. */
  public get fallbackGlyph(): GlyphMetrics | undefined {
    if (this.fallback === undefined) return undefined

    return this._glyphs.get(this.fallback)
  }

  /**
   * Gets the glyph of a character.
   *
   * @param character - Character to look up.
   * @returns The glyph, or the fallback one when the font does not have it.
   */
  public glyph(character: string): GlyphMetrics | undefined {
    return this._glyphs.get(character) ?? this.fallbackGlyph
  }

  protected override onDestroy(): void {
    if (!this.atlas.destroyed) this.atlas.destroy()
    super.onDestroy()
  }
}
