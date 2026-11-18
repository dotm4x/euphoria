import { describe, expect, it } from 'vitest'

import { Font, GlyphMetrics } from '../../../source/index.js'
import { createAtlas, createFont } from '../text/fixtures.js'

describe('Font', () => {
  it('indexes its glyphs and reports which characters it has', () => {
    const font = createFont()

    expect([...font.characters].sort()).toEqual([' ', '?', 'A', 'B'])
    expect(font.glyph('A')?.advance).toBe(6)
  })

  it('falls back to its fallback glyph for characters it does not have', () => {
    const font = createFont()

    expect(font.glyph('Z')?.character).toBe('?')
    expect(font.fallbackGlyph?.character).toBe('?')
  })

  it('reports no glyph when the fallback is missing too', () => {
    const font = new Font({
      family: 'bare',
      size: 10,
      lineHeight: 12,
      ascent: 8,
      descent: 2,
      atlas: createAtlas(),
      glyphs: [],
    })

    expect(font.glyph('A')).toBeUndefined()
    expect(font.fallbackGlyph).toBeUndefined()
  })

  it('destroys its atlas with itself', () => {
    const font = createFont()
    const atlas = font.atlas

    font.destroy()

    expect(atlas.destroyed).toBe(true)
  })

  it('rejects invalid fonts', () => {
    const base = {
      family: 'test',
      size: 10,
      lineHeight: 12,
      ascent: 8,
      descent: 2,
      atlas: createAtlas(),
      glyphs: [],
    }

    expect(() => new Font({ ...base, family: ' ' })).toThrow(/family/)
    expect(() => new Font({ ...base, size: 0 })).toThrow(/design size/)
    expect(() => new Font({ ...base, ascent: Number.NaN })).toThrow(/nonfinite/)
  })

  it('rejects glyphs that are repeated or outside their atlas', () => {
    const options = {
      character: 'A',
      advance: 6,
      left: 0,
      top: 8,
      width: 6,
      height: 8,
      u0: 0,
      v0: 0,
      u1: 0.5,
      v1: 0.5,
    }
    const glyph = new GlyphMetrics(options)

    expect(
      () =>
        new Font({
          family: 'test',
          size: 10,
          lineHeight: 12,
          ascent: 8,
          descent: 2,
          atlas: createAtlas(),
          glyphs: [glyph, glyph],
        }),
    ).toThrow(/more than once/)
    expect(() => new GlyphMetrics({ ...options, u1: 2 })).toThrow(/outside its atlas/)
    expect(() => new GlyphMetrics({ ...options, character: '' })).toThrow(/one character/)
  })
})
