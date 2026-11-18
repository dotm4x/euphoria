import type { Meta, StoryObj } from '@storybook/html-vite'

import { Color, createFontMaterial, type Font } from '@euphoria/engine'

import { TextScene } from '../../scenes/text.js'
import { mountStory } from '../mount.js'

const meta = {
  title: 'Rendering',
} satisfies Meta

export default meta

/**
 * Text drawn from a font atlas.
 *
 * A heading in a pixel font, a centred line, a wrapped paragraph, a right-aligned
 * block and a line that mixes a regular run, a bold run and a coloured run. Every
 * font rasterizes its own atlas; the counter at the bottom right is rewritten
 * every frame, so only that mesh changes.
 */
export const text: StoryObj = {
  render: () =>
    mountStory({
      background: new Color(0.05, 0.06, 0.09, 1),
      scene: async ({ assets, backend, material2D }) => {
        const [body, bold, heading] = await Promise.all([
          assets.load<Font>('fonts/SpaceMono-Regular.ttf'),
          assets.load<Font>('fonts/SpaceMono-Bold.ttf'),
          assets.load<Font>('fonts/PressStart2P-Regular.ttf'),
        ])
        const scene = new TextScene({
          font: body.value,
          boldFont: bold.value,
          headingFont: heading.value,
          material: createFontMaterial(backend, body.value),
          boldMaterial: createFontMaterial(backend, bold.value),
          headingMaterial: createFontMaterial(backend, heading.value),
          panel: material2D,
        })

        return { node: scene, camera: scene.camera, readouts: () => scene.readouts() }
      },
    }),
}
