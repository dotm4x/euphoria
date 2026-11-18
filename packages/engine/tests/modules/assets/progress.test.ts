import { describe, expect, it } from 'vitest'

import {
  AssetLoadState,
  type AssetProgressEntry,
  assetProgressOf,
  createProgressStore,
} from '../../../source/index.js'

function entry(key: string, state: AssetLoadState): AssetProgressEntry {
  return { key, source: key, state }
}

describe('asset progress', () => {
  it('counts what is ready, what failed and what is in flight', () => {
    const progress = assetProgressOf('menu', [
      entry('a', AssetLoadState.loaded),
      entry('b', AssetLoadState.loading),
      entry('c', AssetLoadState.pending),
    ])

    expect(progress.loaded).toBe(1)
    expect(progress.failed).toBe(0)
    expect(progress.total).toBe(3)
    expect(progress.ratio).toBeCloseTo(1 / 3)
    expect(progress.current).toBe('b')
    expect(progress.done).toBe(false)
  })

  it('counts a failure as done so a screen never waits forever', () => {
    const progress = assetProgressOf('menu', [
      entry('a', AssetLoadState.loaded),
      { key: 'b', source: 'b', state: AssetLoadState.failed, error: 'missing' },
    ])

    expect(progress.ratio).toBe(1)
    expect(progress.done).toBe(true)
    expect(progress.entries[1]?.error).toBe('missing')
  })

  it('treats an empty load as complete', () => {
    expect(assetProgressOf('empty', []).ratio).toBe(1)
  })

  it('starts a store with every asset pending', () => {
    const store = createProgressStore('menu', [
      { key: 'a', source: 'a.png' },
      { key: 'b', source: 'b.png' },
    ])

    expect(store.value.total).toBe(2)
    expect(store.value.loaded).toBe(0)
    expect(store.value.current).toBeUndefined()
    store.destroy()
  })
})
