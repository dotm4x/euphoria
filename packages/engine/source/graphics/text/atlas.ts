/** Size of one glyph in the atlas, in pixels. */
export interface GlyphBox {
  /** Character the glyph draws. */
  readonly character: string
  /** Width of the glyph bitmap, in pixels. */
  readonly width: number
  /** Height of the glyph bitmap, in pixels. */
  readonly height: number
}

/** Place of a glyph inside the atlas, in pixels. */
export interface PackedGlyph {
  /** Left edge of the glyph bitmap, in pixels. */
  readonly x: number
  /** Top edge of the glyph bitmap, in pixels. */
  readonly y: number
  /** Width of the glyph bitmap, in pixels. */
  readonly width: number
  /** Height of the glyph bitmap, in pixels. */
  readonly height: number
}

/** Result of packing a set of glyphs into one image. */
export interface AtlasLayout {
  /** Width of the atlas, in pixels. */
  readonly width: number
  /** Height of the atlas, in pixels. */
  readonly height: number
  /** Place of every character, indexed by character. */
  readonly glyphs: ReadonlyMap<string, PackedGlyph>
}

/** Configuration for packing glyphs. */
export interface AtlasOptions {
  /** Maximum width of the atlas, in pixels; defaults to `1024`. */
  readonly maxWidth?: number
  /** Space left around every glyph, in pixels; defaults to `1`. */
  readonly padding?: number
}

/**
 * Packs glyph bitmaps into a single image, row by row.
 *
 * Glyphs are sorted from tallest to shortest so each shelf wastes little space,
 * which is enough for a font atlas and far simpler than a general packer. Rows
 * wrap when the atlas is full, and the returned size is the space the glyphs
 * actually use, without trailing gaps.
 *
 * @param boxes - Glyphs to pack, with the size of their bitmap.
 * @param options - Maximum width and padding of the atlas.
 * @returns The size of the atlas and the place of every glyph.
 * @throws {@link RangeError} If a glyph is wider than the atlas or the options are invalid.
 */
export function packGlyphs(boxes: Iterable<GlyphBox>, options: AtlasOptions = {}): AtlasLayout {
  const { maxWidth = 1024, padding = 1 } = options
  if (!Number.isInteger(maxWidth) || maxWidth <= 0) {
    throw new RangeError('The atlas width must be a positive integer.')
  }

  if (!Number.isInteger(padding) || padding < 0) {
    throw new RangeError('The atlas padding must be a non-negative integer.')
  }

  const sorted = [...boxes].sort((left, right) => right.height - left.height)
  const glyphs = new Map<string, PackedGlyph>()
  let x = 0
  let y = 0
  let shelf = 0
  let used = 0
  let widest = 0

  for (const box of sorted) {
    const width = Math.max(1, Math.ceil(box.width))
    const height = Math.max(1, Math.ceil(box.height))
    if (width + padding * 2 > maxWidth) {
      throw new RangeError(`The glyph '${box.character}' is wider than the atlas.`)
    }

    if (x + width + padding * 2 > maxWidth) {
      x = 0
      y += shelf
      shelf = 0
    }

    glyphs.set(box.character, { x: x + padding, y: y + padding, width, height })
    x += width + padding * 2
    shelf = Math.max(shelf, height + padding * 2)
    used = Math.max(used, y + shelf)
    widest = Math.max(widest, x)
  }

  return { width: Math.min(maxWidth, Math.max(1, widest)), height: Math.max(1, used), glyphs }
}
