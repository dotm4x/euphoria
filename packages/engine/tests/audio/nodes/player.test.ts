import { describe, expect, it } from 'vitest'

import {
  Attenuation,
  AudioClip,
  AudioPlayer,
  AudioSpace,
  masterBusIdentifier,
} from '../../../source/index.js'

const clip = new AudioClip({ data: new ArrayBuffer(16) })

describe('AudioPlayer', () => {
  it('stays silent until it plays', () => {
    const player = new AudioPlayer({ clip })

    expect(player.playing.value).toBe(false)
    expect(player.describe()).toBeUndefined()
    player.destroy()
  })

  it('describes its clip and settings once playing', () => {
    const player = new AudioPlayer({ clip, volume: 0.5, pitch: 2, loop: true, bus: 'music' })

    player.play()

    const descriptor = player.describe()
    expect(descriptor?.clip).toBe(clip)
    expect(descriptor?.space).toBe(AudioSpace.none)
    expect(descriptor?.gain).toBe(0.5)
    expect(descriptor?.pitch).toBe(2)
    expect(descriptor?.loop).toBe(true)
    expect(descriptor?.bus).toBe('music')
    expect(descriptor?.identifier).toBe(player.identifier)
    player.destroy()
  })

  it('routes to the master bus by default', () => {
    const player = new AudioPlayer({ clip })

    player.play()

    expect(player.describe()?.bus).toBe(masterBusIdentifier)
    player.destroy()
  })

  it('starts from the second it was seeked to', () => {
    const player = new AudioPlayer({ clip })

    player.play()
    player.seek(1.5)

    expect(player.describe()?.offset).toBeCloseTo(1.5)
    player.destroy()
  })

  it('stops and rewinds when the backend reports the end', () => {
    const player = new AudioPlayer({ clip })
    let finished = 0
    player.onFinished.connect(() => {
      finished++
    })

    player.play()
    player.seek(2)
    player.notifyVoice({ identifier: player.identifier, finished: true, elapsed: 2 })

    expect(player.playing.value).toBe(false)
    expect(finished).toBe(1)
    expect(player.describe()).toBeUndefined()
    player.destroy()
  })

  it('ignores states of voices that keep playing', () => {
    const player = new AudioPlayer({ clip })
    player.play()

    player.notifyVoice({ identifier: player.identifier, finished: false, elapsed: 0.5 })

    expect(player.playing.value).toBe(true)
    player.destroy()
  })

  it('cannot play without a clip', () => {
    const player = new AudioPlayer()

    expect(() => {
      player.play()
    }).toThrow(/without a clip/)
    player.destroy()
  })

  it('starts on its own when it autoplays', () => {
    const player = new AudioPlayer({ clip, autoplay: true })

    expect(player.playing.value).toBe(true)
    expect(player.describe()).toBeDefined()
    player.destroy()
  })

  it('keeps the distance curve it was given', () => {
    const attenuation = new Attenuation({ minimumDistance: 2, maximumDistance: 6 })
    const player = new AudioPlayer({ clip, attenuation, autoplay: true })

    expect(player.describe()?.attenuation).toBe(attenuation)
    player.destroy()
  })
})
