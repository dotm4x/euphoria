import { describe, expect, it } from 'vitest'

import {
  AudioClip,
  AudioEmitter3D,
  AudioListener3D,
  AudioPlayer,
  Node,
} from '../../source/index.js'

const clip = new AudioClip({ data: new ArrayBuffer(16) })

describe('collectNodeSound', () => {
  it('collects the sound sources of a loaded scene in hierarchy order', async () => {
    const { collectNodeSound } = await import('../../source/index.js')
    const player = new AudioPlayer({ clip })
    const emitter = new AudioEmitter3D({ clip })
    const scene = new Node({ name: 'scene', children: [player, emitter] })
    scene.load()
    const collected: unknown[] = []

    const listener = collectNodeSound(scene, collected as never)

    expect(collected).toEqual([player, emitter])
    expect(listener).toBeUndefined()
    scene.destroy()
  })

  it('finds the first listener of the scene', async () => {
    const { collectNodeSound } = await import('../../source/index.js')
    const camera = new AudioListener3D({ name: 'camera' })
    const scene = new Node({ name: 'scene', children: [new Node(), camera] })
    scene.load()

    const listener = collectNodeSound(scene, [])

    expect(listener).toBe(camera)
    scene.destroy()
  })

  it('skips a scene that is not loaded', async () => {
    const { collectNodeSound } = await import('../../source/index.js')
    const player = new AudioPlayer({ clip })
    const scene = new Node({ name: 'scene', children: [player] })
    const collected: unknown[] = []

    collectNodeSound(scene, collected as never)

    expect(collected).toEqual([])
    scene.destroy()
  })
})
