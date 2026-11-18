import type { Meta, StoryObj } from '@storybook/html-vite'

import { Camera2D, Node2D } from '@euphoria/engine'

import { SpinningMeshNode } from '../../scenes/main.js'
import { createTriangleMesh } from '../../scenes/triangle.js'
import { mountStory } from '../mount.js'

const meta = {
  title: 'Rendering',
} satisfies Meta

export default meta

/** A single vertex-coloured triangle turning around its origin. */
export const triangle: StoryObj = {
  render: () =>
    mountStory({
      scene: ({ material }) => {
        const camera = new Camera2D({ name: 'camera' })
        const node = new Node2D({
          name: 'triangle',
          children: [new SpinningMeshNode({ material, mesh: createTriangleMesh() })],
        })

        return { node, camera }
      },
    }),
}
