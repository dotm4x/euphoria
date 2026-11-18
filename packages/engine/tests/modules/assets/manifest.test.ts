import { describe, expect, it } from 'vitest'

import { AssetManifest } from '../../../source/index.js'

describe('AssetManifest', () => {
  it('keeps the entries and the keys they will use', () => {
    const manifest = new AssetManifest({
      name: 'menu',
      entries: [{ source: 'a.png' }, { key: 'theme', source: 'b.ogg', type: 'audio' }],
    })

    expect(manifest.name).toBe('menu')
    expect(manifest.keys).toEqual(['a.png', 'theme'])
    expect(manifest.entries[1]).toEqual({ key: 'theme', source: 'b.ogg', type: 'audio' })
  })

  it('defaults its name', () => {
    expect(new AssetManifest({ entries: [{ source: 'a.png' }] }).name).toBe('manifest')
  })

  it('rejects an empty, keyless or repeated manifest', () => {
    expect(() => new AssetManifest({ entries: [] })).toThrow(/no entries/)
    expect(() => new AssetManifest({ entries: [{ source: ' ' }] })).toThrow(/empty key/)
    expect(
      () =>
        new AssetManifest({
          entries: [
            { key: 'same', source: 'a' },
            { key: 'same', source: 'b' },
          ],
        }),
    ).toThrow(/repeats a key/)
  })
})
