import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@dotm4x/euphoria': fileURLToPath(
        new URL('../packages/euphoria/source/index.ts', import.meta.url),
      ),
    },
  },
})
