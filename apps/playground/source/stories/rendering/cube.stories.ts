import type { Meta, StoryObj } from '@storybook/html-vite'

import { CubeScene } from '../../scenes/cube.js'
import { mountStory } from '../mount.js'

const meta = {
  title: 'Rendering',
} satisfies Meta

export default meta

/**
 * A lit three-dimensional scene with a free-flying camera: the pointer turns it
 * in place, WASD moves it, Q and E change its height and the wheel sets its
 * speed. Click to lock the pointer, right click to destroy the floating box.
 */
export const cube: StoryObj = {
  render: () =>
    mountStory({
      scene: ({ material3D }) => {
        const scene = new CubeScene(material3D)

        return { node: scene, camera: scene.camera, readouts: () => scene.readouts() }
      },
    }),
}
