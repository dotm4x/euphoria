import type { Meta, StoryObj } from '@storybook/html-vite'

import { type AudioClip, Color } from '@euphoria/engine'

import { AudioScene3D } from '../../scenes/audio3d.js'
import { mountStory } from '../mount.js'

const meta = {
  title: 'Audio',
} satisfies Meta

export default meta

/**
 * Sound placed in space.
 *
 * Three glowing spheres orbit a lit floor, each carrying a looping emitter, so
 * the panning follows what you see. Music loops on its own bus. Press Space to
 * start and stop the music, M to mute everything, and C or T to play a one-shot
 * sound around you. Browsers keep audio suspended until a gesture, so click or
 * press a key first.
 */
export const threeDimensions: StoryObj = {
  render: () =>
    mountStory({
      background: new Color(0.04, 0.05, 0.08, 1),
      scene: async ({ assets, material3D }) => {
        const [music, coin, thud, beep] = await Promise.all([
          assets.load<AudioClip>('sounds/music.mp3'),
          assets.load<AudioClip>('sounds/coin.mp3'),
          assets.load<AudioClip>('sounds/thud.ogg'),
          assets.load<AudioClip>('sounds/beep.ogg'),
        ])
        const scene = new AudioScene3D({
          clips: {
            music: music.value,
            coin: coin.value,
            thud: thud.value,
            beep: beep.value,
          },
          material: material3D,
        })

        return { node: scene, camera: scene.camera, readouts: () => scene.readouts() }
      },
    }),
}
