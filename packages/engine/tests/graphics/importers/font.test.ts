import { describe, expect, it, vi } from 'vitest'

import { FontImporter, supportsFontRasterization } from '../../../source/index.js'

describe('FontImporter', () => {
  it('supports the font formats a browser can load', () => {
    expect(new FontImporter().extensions).toEqual(['.ttf', '.otf', '.woff', '.woff2'])
  })

  it('reports when the environment cannot rasterize fonts', () => {
    expect(supportsFontRasterization(globalThis)).toBe(false)
    const globals: { [key: string]: unknown } = { document: {} }
    Reflect.set(globals, 'FontFace', (): void => undefined)
    expect(supportsFontRasterization(globals)).toBe(true)
    expect(supportsFontRasterization(null)).toBe(false)
  })

  it('needs a DOM to rasterize a font', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(new ArrayBuffer(8)))),
    )

    await expect(
      new FontImporter().load('font.ttf', new AbortController().signal),
    ).rejects.toThrow()

    vi.unstubAllGlobals()
  })
})
