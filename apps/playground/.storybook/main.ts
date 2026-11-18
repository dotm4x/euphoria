import { fileURLToPath } from 'node:url'

import type { StorybookConfig } from '@storybook/html-vite'

/** Alias entry in the array form Vite also accepts. */
interface AliasEntry {
  readonly find: RegExp | string
  readonly replacement: string
}

/** Aliases accepted by Vite, either as a map or as a list. */
type AliasOptions = readonly AliasEntry[] | { [key: string]: string }

const engine = fileURLToPath(new URL('../../../packages/engine/source/index.ts', import.meta.url))

const config: StorybookConfig = {
  stories: ['../source/stories/**/*.stories.ts'],
  framework: { name: '@storybook/html-vite', options: {} },
  staticDirs: ['../public'],
  viteFinal(viteConfig) {
    // Stories import the engine from its sources, so the playground always runs
    // against the working tree instead of a build output.
    const resolve = { ...viteConfig.resolve, alias: withEngineAlias(viteConfig.resolve?.alias) }

    return Promise.resolve({ ...viteConfig, resolve })
  },
}

/**
 * Adds the engine alias to the aliases Storybook already configured.
 *
 * @param alias - Aliases the framework set up, in either accepted shape.
 * @returns The aliases with the engine mapped to its sources.
 */
function withEngineAlias(alias: AliasOptions | undefined): AliasOptions {
  const entry: AliasEntry = { find: '@euphoria/engine', replacement: engine }
  if (alias === undefined) return { '@euphoria/engine': engine }
  // `Array.isArray` does not narrow readonly arrays, so the shapes are narrowed by hand.
  if (Array.isArray(alias)) return [...(alias as readonly AliasEntry[]), entry]

  return { ...(alias as { [key: string]: string }), '@euphoria/engine': engine }
}

export default config
