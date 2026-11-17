import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@euphoria/engine': fileURLToPath(
        new URL('../../packages/engine/source/index.ts', import.meta.url),
      ),
    },
  },
})
