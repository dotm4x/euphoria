import type { Meta, StoryObj } from '@storybook/html-vite'

import { Dimension } from '@euphoria/engine'

import { Physics3DScene } from '../../scenes/physics3d.js'
import { mountStory } from '../mount.js'

const meta = {
  title: 'Physics',
} satisfies Meta

export default meta

/** Cubes fall onto a lit ground while a jointed chain swings from an anchor. */
export const threeDimensions: StoryObj = {
  render: () =>
    mountStory({
      physics: [Dimension.threeDimensional],
      scene: ({ material3D }) => {
        const scene = new Physics3DScene(material3D)

        return {
          node: scene,
          camera: scene.camera,
          joints3D: scene.joints,
          readouts: () => scene.readouts(),
        }
      },
    }),
}
