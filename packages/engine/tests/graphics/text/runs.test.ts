import { describe, expect, it } from 'vitest'

import { Color, Font, GlyphMetrics, layoutText, TextAlignment } from '../../../source/index.js'

import { createAtlas, createFont } from './fixtures.js'

/** A second font with wider glyphs, standing in for a bold face of the same family. */
function createHeavyFont(): Font {
  const glyph = (character: string): GlyphMetrics =>
    new GlyphMetrics({
      character,
      advance: 7,
      left: 0,
      top: 8,
      width: 7,
      height: 8,
      u0: 0,
      v0: 0,
      u1: 0.5,
      v1: 0.5,
    })

  return new Font({
    family: 'test',
    size: 10,
    lineHeight: 14,
    ascent: 9,
    descent: 3,
    weight: 700,
    atlas: createAtlas(),
    glyphs: ['A', 'B', ' ', '?'].map((character) => glyph(character)),
  })
}

describe('text runs', () => {
  it('lays out mixed runs on one line, each with its own metrics', () => {
    const font = createFont()
    const bold = createHeavyFont()
    const layout = layoutText(font, [{ text: 'A' }, { text: 'B', font: bold }])

    expect(layout.quads.map((quad) => quad.character)).toEqual(['A', 'B'])
    expect(layout.quads[1]?.x).toBeCloseTo(6)
    expect(layout.width).toBeCloseTo(13)
  })

  it('uses the size of each run', () => {
    const font = createFont()
    const layout = layoutText(font, [{ text: 'A' }, { text: 'A', pixelSize: 20 }])

    expect(layout.quads[0]?.height).toBeCloseTo(8)
    expect(layout.quads[1]?.height).toBeCloseTo(16)
  })

  it('carries the color of every run into its glyphs', () => {
    const red = new Color(1, 0, 0, 1)
    const layout = layoutText(createFont(), [{ text: 'A' }, { text: 'B', color: red }])

    expect(layout.quads[0]?.color).toEqual(Color.white)
    expect(layout.quads[1]?.color).toEqual(red)
  })

  it('wraps across runs and keeps their styles', () => {
    const red = new Color(1, 0, 0, 1)
    const layout = layoutText(createFont(), [{ text: 'A A' }, { text: ' A', color: red }], {
      wrapWidth: 16,
    })

    expect(layout.lines).toEqual(['A A', 'A'])
    expect(layout.quads.at(-1)?.color).toEqual(red)
  })

  it('aligns runs using the width of every glyph', () => {
    const layout = layoutText(createFont(), [{ text: 'A' }, { text: 'B' }], {
      align: TextAlignment.right,
      wrapWidth: 20,
    })

    expect(layout.quads[0]?.x).toBeCloseTo(9)
  })

  it('keeps paragraph breaks inside a run', () => {
    const layout = layoutText(createFont(), [{ text: 'A\nB' }])

    expect(layout.lines).toEqual(['A', 'B'])
    expect(layout.height).toBe(24)
  })

  it('takes the tallest run as the height of a line', () => {
    const layout = layoutText(createFont(), [{ text: 'A' }, { text: 'B', font: createHeavyFont() }])

    expect(layout.lineHeight).toBeCloseTo(14)
  })
})

describe('font weight', () => {
  it('describes the weight of the face', () => {
    expect(createFont().weight).toBe(400)
    expect(createHeavyFont().weight).toBe(700)
  })

  it('rejects weights outside the range a browser accepts', () => {
    expect(
      () =>
        new Font({
          family: 'broken',
          size: 10,
          lineHeight: 12,
          ascent: 8,
          descent: 2,
          weight: 1200,
          atlas: createAtlas(),
          glyphs: [],
        }),
    ).toThrow(/weight/)
  })
})
