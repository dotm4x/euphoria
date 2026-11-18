import { type ReadOnlyStore, Store } from '#/core/events/store.js'

/** State of one asset of a load. */
export enum AssetLoadState {
  /** The asset is still queued. */
  pending = 'pending',
  /** The asset is being fetched or decoded. */
  loading = 'loading',
  /** The asset is ready. */
  loaded = 'loaded',
  /** The asset could not be loaded. */
  failed = 'failed',
}

/** Progress of one asset of a load. */
export interface AssetProgressEntry {
  /** Cache key of the asset. */
  readonly key: string
  /** Source the importer reads. */
  readonly source: string
  /** State of the asset. */
  readonly state: AssetLoadState
  /** Message of the failure, when the asset could not be loaded. */
  readonly error?: string | undefined
}

/** Snapshot of a load, ready for a loading screen. */
export interface AssetProgress {
  /** Name of the load, normally the manifest name. */
  readonly name: string
  /** Assets of the load. */
  readonly entries: readonly AssetProgressEntry[]
  /** Assets that are ready. */
  readonly loaded: number
  /** Assets that failed. */
  readonly failed: number
  /** Assets of the load. */
  readonly total: number
  /** Progress from `0` to `1`, counting failures as done. */
  readonly ratio: number
  /** Key of the asset being loaded, when there is one. */
  readonly current: string | undefined
  /** Whether every asset is ready or failed. */
  readonly done: boolean
}

/** A load that reports its own progress. */
export interface AssetLoadReport {
  /** Observable progress of the load. */
  readonly progress: ReadOnlyStore<AssetProgress>
  /** Resolves once every asset is ready or failed. */
  readonly finished: Promise<readonly AssetProgressEntry[]>
}

/**
 * Creates the progress snapshot of a load.
 *
 * @param name - Name of the load.
 * @param entries - State of every asset.
 * @returns The snapshot a loading screen reads.
 */
export function assetProgressOf(
  name: string,
  entries: readonly AssetProgressEntry[],
): AssetProgress {
  const loaded = entries.filter((entry) => entry.state === AssetLoadState.loaded).length
  const failed = entries.filter((entry) => entry.state === AssetLoadState.failed).length
  const total = entries.length
  const current = entries.find((entry) => entry.state === AssetLoadState.loading)?.key

  return {
    name,
    entries,
    loaded,
    failed,
    total,
    ratio: total === 0 ? 1 : (loaded + failed) / total,
    current,
    done: loaded + failed === total,
  }
}

/**
 * Creates the store a load reports through.
 *
 * @param name - Name of the load.
 * @param keys - Keys of every asset of the load.
 * @returns The store, holding an empty load.
 */
export function createProgressStore(
  name: string,
  keys: readonly AssetManifestKey[],
): Store<AssetProgress> {
  return new Store<AssetProgress>(
    assetProgressOf(
      name,
      keys.map(({ key, source }) => ({ key, source, state: AssetLoadState.pending })),
    ),
  )
}

/** Key and source of one asset of a load. */
export interface AssetManifestKey {
  /** Cache key of the asset. */
  readonly key: string
  /** Source the importer reads. */
  readonly source: string
}
