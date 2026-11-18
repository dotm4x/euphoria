import type { Meta, StoryObj } from '@storybook/html-vite'

import { Camera2D } from '@euphoria/engine'

import { MainScene } from '../../scenes/main.js'
import { mountStory } from '../mount.js'

const meta = {
  title: 'Rendering',
} satisfies Meta

export default meta

/**
 * Sprites, meshes and a viewport with a vignette material, all drawn from a
 * single scene tree.
 */
export const spritesAndMeshes: StoryObj = {
  render: () =>
    mountStory({
      scene: ({ material }) => {
        const camera = new Camera2D({ name: 'camera' })
        const scene = new MainScene(material, camera)

        return { node: scene, camera }
      },
    }),
}
