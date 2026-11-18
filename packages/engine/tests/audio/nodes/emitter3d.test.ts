import { describe, expect, it } from 'vitest'

import { AudioClip, AudioEmitter3D, AudioSpace, Node3D, Vector3 } from '../../../source/index.js'

const clip = new AudioClip({ data: new ArrayBuffer(16) })

describe('AudioEmitter3D', () => {
  it('describes the position it inherits from its parent', () => {
    const body = new Node3D({ position: new Vector3(3, 1, -2) })
    const emitter = new AudioEmitter3D({ clip, autoplay: true })
    body.add(emitter)
    body.load()

    const descriptor = emitter.describe()

    expect(descriptor?.space).toBe(AudioSpace.spatial)
    expect(descriptor?.position).toEqual(new Vector3(3, 1, -2))
    body.destroy()
  })

  it('describes the direction it faces', () => {
    const emitter = new AudioEmitter3D({
      clip,
      autoplay: true,
      rotation: new Vector3(0, Math.PI / 2, 0),
    })
    emitter.load()

    const descriptor = emitter.describe()

    expect(descriptor?.forward.x).toBeCloseTo(-1)
    expect(descriptor?.forward.z).toBeCloseTo(0)
    emitter.destroy()
  })

  it('stays silent until it plays', () => {
    const emitter = new AudioEmitter3D({ clip })
    emitter.load()

    expect(emitter.describe()).toBeUndefined()
    emitter.play()
    expect(emitter.describe()).toBeDefined()
    emitter.destroy()
  })

  it('clears its state when the backend reports the end of the clip', () => {
    const emitter = new AudioEmitter3D({ clip, autoplay: true })
    emitter.load()

    emitter.notifyVoice({ identifier: emitter.identifier, finished: true, elapsed: 1 })

    expect(emitter.playing.value).toBe(false)
    emitter.destroy()
  })
})
