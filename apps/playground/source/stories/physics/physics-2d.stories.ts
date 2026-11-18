import type { Meta, StoryObj } from '@storybook/html-vite'

import { Dimension, type SimulationSpace } from '@euphoria/engine'

import { PhysicsScene } from '../../scenes/physics2d.js'
import { mountStory } from '../mount.js'

const meta = {
  title: 'Physics',
} satisfies Meta

export default meta

/**
 * Boxes fall through a sensor gate onto a static floor and a jointed chain hangs
 * from a fixed anchor. Click to poke the body under the cursor through a ray
 * cast and press F to outline the colliders.
 */
export const twoDimensions: StoryObj = {
  render: () =>
    mountStory({
      physics: [Dimension.twoDimensional],
      scene: ({ material2D }) => {
        const scene = new PhysicsScene(material2D)

        return {
          node: scene,
          camera: scene.camera,
          joints2D: scene.joints,
          attach: (space: SimulationSpace) => {
            scene.attach(space)
          },
          readouts: () => scene.readouts(),
        }
      },
    }),
}
