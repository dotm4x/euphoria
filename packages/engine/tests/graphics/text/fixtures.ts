import { Font, GlyphMetrics, Image } from '../../../source/index.js'

/** Creates an atlas image filled with a byte pattern, for tests. */
export function createAtlas(size: number = 8): Image {
  return new Image(size, size, new Uint8Array(size * size * 4))
}

/**
 * Creates a deterministic font: every glyph advances six units and draws a
 * six-by-eight bitmap from the top of the atlas.
 *
 * @param size - Design size of the font.
 * @param tracking - Extra space added between glyphs.
 * @returns A font with the characters `A`, `B`, a space and a fallback `?`.
 */
export function createFont(size: number = 10, tracking: number = 0): Font {
  const glyph = (character: string, advance: number, width: number, height: number): GlyphMetrics =>
    new GlyphMetrics({
      character,
      advance,
      left: 0,
      top: height,
      width,
      height,
      u0: 0,
      v0: 0,
      u1: 0.5,
      v1: 0.5,
    })

  return new Font({
    family: 'test',
    size,
    lineHeight: 12,
    ascent: 8,
    descent: 2,
    atlas: createAtlas(),
    tracking,
    glyphs: [glyph('A', 6, 6, 8), glyph('B', 5, 5, 8), glyph(' ', 3, 0, 0), glyph('?', 6, 6, 8)],
  })
}
