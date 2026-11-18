import type { Meta, StoryObj } from '@storybook/html-vite'

import { Camera2D } from '@euphoria/engine'

import { SnakeScene } from '../../scenes/snake/scene.js'
import { mountStory } from '../mount.js'

const meta = {
  title: 'Games',
} satisfies Meta

export default meta

/**
 * A playable snake. Arrows or WASD steer and start the game, Space pauses and R
 * restarts it.
 */
export const snake: StoryObj = {
  render: () =>
    mountStory({
      scene: ({ material2D }) => {
        const camera = new Camera2D({ name: 'camera' })
        const scene = new SnakeScene(material2D, camera)

        return { node: scene, camera, readouts: () => scene.readouts() }
      },
    }),
}
