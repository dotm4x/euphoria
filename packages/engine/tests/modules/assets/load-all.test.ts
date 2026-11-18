import { describe, expect, it } from 'vitest'

import {
  AssetImporter,
  AssetManifest,
  AssetsModule,
  Game,
  type ImportedAsset,
} from '../../../source/index.js'

class TestGame extends Game {}

/** Importer that resolves or fails depending on the source. */
class SlowImporter extends AssetImporter<string> {
  public readonly loaded: string[] = []

  public constructor() {
    super({ identifier: 'slow', extensions: ['txt'] })
  }

  public override load(source: string): Promise<ImportedAsset<string>> {
    if (source.includes('missing')) return Promise.reject(new Error(`No '${source}'.`))
    this.loaded.push(source)

    return Promise.resolve({ value: source })
  }
}

function manifestOf(...sources: readonly string[]): AssetManifest {
  return new AssetManifest({ name: 'menu', entries: sources.map((source) => ({ source })) })
}

describe('AssetsModule.loadAll', () => {
  it('loads every asset of the manifest and reports the final progress', async () => {
    const module = new AssetsModule({ importers: [new SlowImporter()] })
    const report = module.loadAll(manifestOf('a.txt', 'b.txt'))

    const entries = await report.finished

    expect(entries.map((entry) => entry.state)).toEqual(['loaded', 'loaded'])
    expect(report.progress.value.loaded).toBe(2)
    expect(report.progress.value.done).toBe(true)
    expect(report.progress.value.ratio).toBe(1)
    module.destroy()
  })

  it('reports a failed asset with the message of the importer', async () => {
    const module = new AssetsModule({ importers: [new SlowImporter()] })

    const entries = await module.loadAll(manifestOf('a.txt', 'missing.txt')).finished

    expect(entries[1]?.state).toBe('failed')
    expect(entries[1]?.error).toMatch(/No 'missing.txt'/)
    module.destroy()
  })

  it('keeps loading the rest when one asset fails', async () => {
    const importer = new SlowImporter()
    const module = new AssetsModule({ importers: [importer] })

    const report = module.loadAll(manifestOf('missing.txt', 'b.txt'))
    await report.finished

    expect(report.progress.value.loaded).toBe(1)
    expect(report.progress.value.failed).toBe(1)
    expect(importer.loaded).toEqual(['b.txt'])
    module.destroy()
  })

  it('is owned by the game that runs it', async () => {
    const module = new AssetsModule({ importers: [new SlowImporter()] })
    const game = new TestGame([module])
    game.start()

    await module.loadAll(manifestOf('a.txt')).finished

    game.stop()
    game.destroy()
    expect(module.destroyed).toBe(true)
  })
})
