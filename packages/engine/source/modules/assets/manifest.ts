import { Resource } from '#/core/primitives/resource.js'

/** One asset a manifest asks for. */
export interface AssetManifestEntry {
  /** Source the importer reads. */
  readonly source: string
  /** Cache key of the asset; defaults to the source. */
  readonly key?: string
  /** Importer identifier; defaults to the one registered for the extension. */
  readonly type?: string
}

/** A list of assets a screen asks for before it can start. */
export interface AssetManifestDocument {
  /** Assets the manifest groups. */
  readonly entries: readonly AssetManifestEntry[]
  /** Name of the manifest, used in diagnostics; defaults to `manifest`. */
  readonly name?: string
}

/**
 * A named group of assets, loaded together with a single progress value.
 *
 * A manifest is data, normally the JSON a game ships next to its assets, so a
 * loading screen describes what it needs without a list of `load` calls.
 */
export class AssetManifest extends Resource {
  /** Name of the manifest. */
  public readonly name: string

  /** Assets the manifest asks for. */
  public readonly entries: readonly AssetManifestEntry[]

  /**
   * @param document - Name and entries of the manifest.
   * @throws {@link Error} If the manifest is empty or repeats a key.
   */
  public constructor({ name = 'manifest', entries }: AssetManifestDocument) {
    super()
    if (entries.length === 0) throw new Error(`Asset manifest '${name}' has no entries.`)

    const keys = entries.map((entry) => entry.key ?? entry.source)
    for (const key of keys) {
      if (!key.trim()) throw new Error(`Asset manifest '${name}' has an empty key.`)
    }

    if (new Set(keys).size !== keys.length) {
      throw new Error(`Asset manifest '${name}' repeats a key.`)
    }

    this.name = name
    this.entries = entries.map((entry) => ({ ...entry }))
  }

  /** Keys of every asset the manifest groups. */
  public get keys(): readonly string[] {
    return this.entries.map((entry) => entry.key ?? entry.source)
  }
}
