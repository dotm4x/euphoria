import type { Meta, StoryObj } from '@storybook/html-vite'

import { Camera2D } from '@euphoria/engine'

import { type BallsMode, BallsScene } from '../../scenes/bench/scene.js'
import { mountStory } from '../mount.js'

/** Arguments the benchmark exposes as controls. */
interface BallsArgs {
  /** Number of bouncing balls. */
  readonly count: number
  /** Whether one node draws every ball or each ball gets its own node. */
  readonly mode: BallsMode
}

const meta = {
  title: 'Benchmarks',
  args: { count: 1000, mode: 'single' },
  argTypes: {
    count: { control: { type: 'range', min: 100, max: 50000, step: 100 } },
    mode: { control: { type: 'inline-radio' }, options: ['single', 'nodes'] },
  },
  render: ({ count, mode }) =>
    mountStory({
      scene: ({ material2D }) => {
        const camera = new Camera2D({ name: 'camera' })
        const scene = new BallsScene(material2D, camera, mode, count)

        return {
          node: scene,
          camera,
          readouts: () => scene.readouts(),
          benchmark: { mode, count, nodes: mode === 'single' ? 1 : count },
        }
      },
    }),
} satisfies Meta<BallsArgs>

export default meta

/**
 * Bouncing balls used to compare the single-node and one-node-per-ball
 * implementations. The ball count and the mode are arguments, so both the
 * controls and the benchmark script can set them.
 */
export const balls: StoryObj<BallsArgs> = {}
