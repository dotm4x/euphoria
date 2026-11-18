import type { Meta, StoryObj } from '@storybook/html-vite'

import { AssetManifest, Color, type Model } from '@euphoria/engine'

import { modelCamera, ModelScene } from '../../scenes/model.js'
import { mountStory } from '../mount.js'

const meta = {
  title: 'Rendering',
} satisfies Meta

export default meta

/**
 * A model read from a glTF binary.
 *
 * The file is parsed into geometry and a node hierarchy, and the scene builds one
 * mesh instance per part, so the duck spins with the material the story gives it.
 * The manifest is loaded before the scene exists, so the story shows the loading
 * bar of the runtime while the file is read. Drag to orbit, scroll to zoom.
 */
export const model: StoryObj = {
  render: () =>
    mountStory({
      background: new Color(0.05, 0.06, 0.09, 1),
      preload: new AssetManifest({ name: 'duck', entries: [{ source: 'models/duck.glb' }] }),
      scene: async ({ assets, material3D }) => {
        const duck = await assets.load<Model>('models/duck.glb')
        const camera = modelCamera(duck.value)
        const scene = new ModelScene({ model: duck.value, material: material3D, camera })

        return { node: scene, camera, readouts: () => scene.readouts() }
      },
    }),
}
