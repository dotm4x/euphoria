import type { Preview } from '@storybook/html-vite'

import { disposeRuntime } from '../source/runtime/runtime.js'

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#101218' },
        { name: 'light', value: '#f5f6fa' },
      ],
    },
  },
  // A story runs one engine instance; the next one must not inherit it.
  beforeEach: () => {
    disposeRuntime()
  },
}

export default preview
