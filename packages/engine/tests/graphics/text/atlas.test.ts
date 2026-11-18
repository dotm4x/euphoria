import { describe, expect, it } from 'vitest'

import { packGlyphs } from '../../../source/index.js'

describe('packGlyphs', () => {
  it('places glyphs in rows without overlapping them', () => {
    const atlas = packGlyphs(
      [
        { character: 'a', width: 10, height: 10 },
        { character: 'b', width: 20, height: 10 },
        { character: 'c', width: 10, height: 4 },
      ],
      { maxWidth: 100, padding: 1 },
    )

    expect(atlas.glyphs.get('a')).toEqual({ x: 1, y: 1, width: 10, height: 10 })
    expect(atlas.glyphs.get('b')).toEqual({ x: 13, y: 1, width: 20, height: 10 })
    expect(atlas.glyphs.get('c')).toMatchObject({ x: 35, y: 1, width: 10, height: 4 })
    expect(atlas.height).toBe(12)
  })

  it('wraps into another row when the atlas is full', () => {
    const atlas = packGlyphs(
      [
        { character: 'a', width: 20, height: 20 },
        { character: 'b', width: 20, height: 10 },
      ],
      { maxWidth: 40, padding: 0 },
    )

    expect(atlas.glyphs.get('a')).toMatchObject({ x: 0, y: 0 })
    expect(atlas.glyphs.get('b')).toMatchObject({ x: 20, y: 0 })
    expect(atlas.height).toBe(20)

    const wrapped = packGlyphs(
      [
        { character: 'a', width: 30, height: 20 },
        { character: 'b', width: 20, height: 10 },
      ],
      { maxWidth: 40, padding: 0 },
    )

    expect(wrapped.glyphs.get('b')).toMatchObject({ x: 0, y: 20 })
    expect(wrapped.width).toBe(30)
    expect(wrapped.height).toBe(30)
  })

  it('sorts the tallest glyphs first so rows waste little space', () => {
    const atlas = packGlyphs(
      [
        { character: 'a', width: 10, height: 5 },
        { character: 'b', width: 10, height: 20 },
      ],
      { maxWidth: 10, padding: 0 },
    )

    expect(atlas.glyphs.get('b')?.y).toBe(0)
    expect(atlas.glyphs.get('a')?.y).toBe(20)
  })

  it('rejects glyphs wider than the atlas and invalid options', () => {
    expect(() =>
      packGlyphs([{ character: 'a', width: 200, height: 10 }], { maxWidth: 100 }),
    ).toThrow(/wider than the atlas/)
    expect(() => packGlyphs([], { maxWidth: 0 })).toThrow(/atlas width/)
    expect(() => packGlyphs([], { padding: -1 })).toThrow(/padding/)
  })

  it('returns an atlas of at least one pixel for an empty font', () => {
    expect(packGlyphs([])).toEqual({ width: 1, height: 1, glyphs: new Map() })
  })
})
