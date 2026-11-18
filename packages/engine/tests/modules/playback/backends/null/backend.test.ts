import { describe, expect, it } from 'vitest'

import {
  AudioClip,
  ListenerDescriptor,
  NullAudioBackend,
  PlaybackDescriptor,
  PlaybackState,
} from '../../../../../source/index.js'

const clip = new AudioClip({ data: new ArrayBuffer(16) })

function frameWith(voices: readonly PlaybackDescriptor[]) {
  return {
    listener: new ListenerDescriptor(),
    voices,
    buses: [],
    masterVolume: 1,
    muted: false,
  }
}

function voice(identifier: string): PlaybackDescriptor {
  return new PlaybackDescriptor({ identifier, clip })
}

describe('NullAudioBackend', () => {
  it('starts idle and follows the device state it is asked for', async () => {
    const backend = new NullAudioBackend()

    expect(backend.state.value).toBe(PlaybackState.idle)
    await backend.resume()
    expect(backend.state.value).toBe(PlaybackState.running)
    await backend.suspend()
    expect(backend.state.value).toBe(PlaybackState.suspended)
    backend.destroy()
  })

  it('remembers the frames it receives', () => {
    const backend = new NullAudioBackend()

    backend.sync(frameWith([voice('music')]))

    expect(backend.frames).toHaveLength(1)
    expect(backend.active).toEqual(['music'])
    expect(backend.stats.voices).toBe(1)
    backend.destroy()
  })

  it('reports the voices that finished', () => {
    const backend = new NullAudioBackend()
    backend.sync(frameWith([voice('music')]))
    backend.advance(0.5)

    backend.finish('music')
    const result = backend.read()

    expect(result.voices).toEqual([{ identifier: 'music', finished: true, elapsed: 0.5 }])
    expect(backend.read().voices).toEqual([])
    backend.destroy()
  })

  it('decodes clips on demand', async () => {
    const backend = new NullAudioBackend()

    expect(backend.isDecoded(clip)).toBe(false)
    await backend.decode(clip)

    expect(backend.isDecoded(clip)).toBe(true)
    expect(backend.stats.clips).toBe(1)
    backend.destroy()
  })

  it('separates decoding from playing', async () => {
    const backend = new NullAudioBackend()
    await backend.decode(clip)

    expect(backend.frames).toEqual([])
    expect(backend.duration(clip)).toBeUndefined()
    backend.destroy()
  })
})
