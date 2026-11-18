import { describe, expect, it } from 'vitest'

import { layoutText, measureText, TextAlignment } from '../../../source/index.js'

import { createFont } from './fixtures.js'

describe('layoutText', () => {
  it('places glyphs from the top-left corner, advancing the pen', () => {
    const font = createFont()
    const layout = layoutText(font, 'AB')

    expect(layout.width).toBe(11)
    expect(layout.height).toBe(12)
    expect(layout.baseline).toBe(8)
    expect(
      layout.quads.map((quad) => [quad.character, quad.x, quad.y, quad.width, quad.height]),
    ).toEqual([
      ['A', 0, 0, 6, 8],
      ['B', 6, 0, 5, 8],
    ])
  })

  it('keeps a quad per visible glyph and skips the blank ones', () => {
    const layout = layoutText(createFont(), 'A A')

    expect(layout.quads.map((quad) => quad.character)).toEqual(['A', 'A'])
    expect(layout.quads[1]?.x).toBe(9)
    expect(layout.width).toBe(15)
  })

  it('stacks paragraphs on separate lines', () => {
    const layout = layoutText(createFont(), 'A\nB')

    expect(layout.lines).toEqual(['A', 'B'])
    expect(layout.height).toBe(24)
    expect(layout.quads[1]?.y).toBe(12)
  })

  it('breaks lines at spaces when a width is given', () => {
    const layout = layoutText(createFont(), 'A A A', { wrapWidth: 16 })

    expect(layout.lines).toEqual(['A A', 'A'])
    expect(layout.width).toBe(16)
    expect(layout.height).toBe(24)
  })

  it('aligns lines inside the wrap width', () => {
    const center = layoutText(createFont(), 'AB', {
      align: TextAlignment.center,
      wrapWidth: 20,
    })
    const right = layoutText(createFont(), 'AB', {
      align: TextAlignment.right,
      wrapWidth: 20,
    })

    expect(center.quads[0]?.x).toBeCloseTo(4.5)
    expect(right.quads[0]?.x).toBeCloseTo(9)
  })

  it('scales every metric with the requested size', () => {
    const layout = layoutText(createFont(10), 'AB', { pixelSize: 20 })

    expect(layout.width).toBe(22)
    expect(layout.lineHeight).toBe(24)
    expect(layout.baseline).toBe(16)
    expect(layout.quads[0]?.height).toBe(16)
  })

  it('adds tracking between glyphs but not after the last one', () => {
    const layout = layoutText(createFont(10, 2), 'AB')

    expect(layout.quads[1]?.x).toBe(8)
    expect(layout.width).toBe(13)
  })

  it('falls back to the glyph of the font for unknown characters', () => {
    const layout = layoutText(createFont(), 'Z')

    expect(layout.quads).toHaveLength(1)
    expect(layout.width).toBe(6)
  })

  it('lays out an empty text as an empty box', () => {
    const layout = layoutText(createFont(), '')

    expect(layout.quads).toHaveLength(0)
    expect(layout.lines).toEqual([''])
    expect(layout.width).toBe(0)
    expect(layout.height).toBe(12)
  })

  it('rejects settings that cannot be laid out', () => {
    const font = createFont()

    expect(() => layoutText(font, 'A', { pixelSize: 0 })).toThrow(/size/)
    expect(() => layoutText(font, 'A', { lineSpacing: 0 })).toThrow(/line spacing/)
    expect(() => layoutText(font, 'A', { wrapWidth: -1 })).toThrow(/wrap width/)
  })

  it('measures a text with the same rules it lays it out', () => {
    const font = createFont()

    expect(measureText(font, 'A A A', { wrapWidth: 16 })).toEqual({ width: 16, height: 24 })
  })
})
