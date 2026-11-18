import type { Meta, StoryObj } from '@storybook/html-vite'

import { Color } from '@euphoria/engine'

import { PbrScene } from '../../scenes/pbr.js'
import { mountStory } from '../mount.js'

const meta = {
  title: 'Rendering',
} satisfies Meta

export default meta

/**
 * A physical material lit from the side.
 *
 * The brick wall uses three maps generated in code —color, normals and a
 * roughness channel— and a directional light that rakes across it, so the
 * recessed mortar reads as relief. The camera drifts and the light sweeps to show
 * the highlight moving over the surface.
 */
export const pbr: StoryObj = {
  render: () =>
    mountStory({
      background: new Color(0.03, 0.035, 0.05, 1),
      scene: ({ backend }) => {
        const scene = new PbrScene({ backend })

        return { node: scene, camera: scene.camera, readouts: () => scene.readouts() }
      },
    }),
}
