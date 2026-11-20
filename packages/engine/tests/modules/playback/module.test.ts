import { describe, expect, it } from 'vitest'

import {
  AudioBackend,
  AudioBus,
  AudioClip,
  AudioEmitter2D,
  AudioListener2D,
  AudioPlayer,
  Game,
  Node,
  NullAudioBackend,
  type PlaybackFrame,
  PlaybackModule,
  PlaybackState,
  type PlaybackStats,
  Store,
  Vector2,
  Vector3,
} from '../../../source/index.js'

class FailingBackend extends AudioBackend {
  public readonly state: Store<PlaybackState> = new Store<PlaybackState>(PlaybackState.suspended)
  public readonly stats: PlaybackStats = { voices: 0, buses: 0, clips: 0 }
  public failing: boolean = true

  public constructor() {
    super('failing')
  }

  public decode(): Promise<void> {
    return Promise.resolve()
  }

  public duration(): undefined {
    return undefined
  }

  public sync(_frame: PlaybackFrame): void {
    if (this.failing) throw new Error('The audio device is not available.')
  }

  public advance(): void {
    // The device keeps no clock while it fails.
  }

  public read(): { voices: [] } {
    return { voices: [] }
  }

  public resume(): Promise<void> {
    return Promise.resolve()
  }

  public suspend(): Promise<void> {
    return Promise.resolve()
  }

  protected override onDestroy(): void {
    if (!this.state.destroyed) this.state.destroy()
  }
}

const clip = new AudioClip({ data: new ArrayBuffer(16) })
const context = { deltaTime: 1 / 60, updateRate: 60 }

class TestGame extends Game {}

function update(module: PlaybackModule): void {
  module.update(context)
}

describe('PlaybackModule', () => {
  it('sends the voices of its entries to the backend', () => {
    const backend = new NullAudioBackend()
    const music = new AudioPlayer({ clip, autoplay: true, volume: 0.4 })
    const module = new PlaybackModule({ backend, entries: [music] })

    update(module)

    expect(backend.frame?.voices).toHaveLength(1)
    expect(backend.frame?.voices[0]?.gain).toBe(0.4)
    expect(module.voices.value).toHaveLength(1)
    module.destroy()
  })

  it('sounds the entries it composes, like the ones it was given', () => {
    const backend = new NullAudioBackend()
    const composed = new AudioPlayer({ clip, autoplay: true, name: 'composed' })
    class ComposingModule extends PlaybackModule {
      protected override *compose(): Generator<AudioPlayer, void, unknown> {
        yield composed
      }
    }

    const module = new ComposingModule({ backend })
    const game = new TestGame([module])
    game.start()
    update(module)

    expect(module.entries.has(composed)).toBe(true)
    expect(backend.frame?.voices).toHaveLength(1)
    game.stop()
    game.destroy()
  })

  it('takes the first listener of the scene as its ear', () => {
    const backend = new NullAudioBackend()
    const camera = new AudioListener2D({ position: new Vector2(0, 2) })
    const scene = new Node({ name: 'scene', children: [camera] })
    scene.load()
    const module = new PlaybackModule({ backend, entries: [scene] })

    update(module)

    expect(backend.frame?.listener.position).toEqual(new Vector3(0, 2, 0))
    module.destroy()
    scene.destroy()
  })

  it('follows a listener set by the game', () => {
    const backend = new NullAudioBackend()
    const camera = new AudioListener2D({ position: new Vector2(5, 0) })
    camera.load()
    const module = new PlaybackModule({ backend })
    module.listener.value = camera

    update(module)

    expect(backend.frame?.listener.position).toEqual(new Vector3(5, 0, 0))
    module.destroy()
    camera.destroy()
  })

  it('places the emitters of a loaded scene where they are', () => {
    const backend = new NullAudioBackend()
    const emitter = new AudioEmitter2D({ clip, autoplay: true, position: new Vector2(1, 2) })
    const scene = new Node({ name: 'scene', children: [emitter] })
    scene.load()
    const module = new PlaybackModule({ backend, entries: [scene] })

    update(module)

    expect(backend.frame?.voices[0]?.position).toEqual(new Vector3(1, 2, 0))
    module.destroy()
    scene.destroy()
  })

  it('mixes the master gain and the buses into the frame', () => {
    const backend = new NullAudioBackend()
    const music = new AudioBus({ identifier: 'music', volume: 0.5 })
    const module = new PlaybackModule({
      backend,
      buses: [music],
      masterVolume: 0.8,
      muted: true,
    })

    update(module)

    expect(backend.frame?.masterVolume).toBe(0.8)
    expect(backend.frame?.muted).toBe(true)
    expect(backend.frame?.buses[0]?.identifier).toBe('music')
    expect(backend.frame?.buses[0]?.volume).toBe(0.5)
    module.destroy()
    expect(music.destroyed).toBe(true)
  })

  it('keeps the loudest voices when the device is limited', () => {
    const backend = new NullAudioBackend()
    const quiet = new AudioPlayer({ clip, autoplay: true, priority: 1 })
    const loud = new AudioPlayer({ clip, autoplay: true, priority: 9 })
    const middle = new AudioPlayer({ clip, autoplay: true, priority: 5 })
    const module = new PlaybackModule({
      backend,
      entries: [quiet, loud, middle],
      maxVoices: 2,
    })

    update(module)

    const identifiers = backend.frame?.voices.map((voice) => voice.identifier) ?? []
    expect(identifiers).toEqual([loud.identifier, middle.identifier])
    module.destroy()
  })

  it('reports the end of a voice back to its node', () => {
    const backend = new NullAudioBackend()
    const music = new AudioPlayer({ clip, autoplay: true })
    let finished = 0
    music.onFinished.connect(() => {
      finished++
    })
    const module = new PlaybackModule({ backend, entries: [music] })
    update(module)

    backend.finish(music.identifier)
    update(module)

    expect(finished).toBe(1)
    expect(music.playing.value).toBe(false)

    update(module)
    expect(backend.frame?.voices).toHaveLength(0)
    module.destroy()
  })

  it('plays a clip without a node and forgets it when it ends', () => {
    const backend = new NullAudioBackend()
    const module = new PlaybackModule({ backend })

    const oneShot = module.play(clip, { volume: 0.3, position: new Vector3(2, 0, 0) })
    update(module)

    expect(backend.frame?.voices[0]?.identifier).toBe(oneShot.identifier)
    expect(backend.frame?.voices[0]?.gain).toBe(0.3)
    expect(backend.frame?.voices[0]?.position).toEqual(new Vector3(2, 0, 0))

    backend.finish(oneShot.identifier)
    update(module)
    update(module)

    expect(backend.frame?.voices).toHaveLength(0)
    module.destroy()
  })

  it('stops every voice it played without a node', () => {
    const backend = new NullAudioBackend()
    const module = new PlaybackModule({ backend })
    module.play(clip)
    update(module)

    module.stopAll()
    update(module)

    expect(backend.frame?.voices).toHaveLength(0)
    expect(module.voices.value).toHaveLength(0)
    module.destroy()
  })

  it('decodes each clip once, out of the frame', async () => {
    const backend = new NullAudioBackend()
    const music = new AudioPlayer({ clip, autoplay: true })
    const module = new PlaybackModule({ backend, entries: [music] })

    update(module)
    update(module)
    await module.preload([clip])

    expect(backend.isDecoded(clip)).toBe(true)
    expect(backend.stats.clips).toBe(1)
    module.destroy()
  })

  it('exposes the state of the device it owns', async () => {
    const backend = new NullAudioBackend()
    const module = new PlaybackModule({ backend })

    await module.resume()
    expect(module.deviceState.value).toBe(PlaybackState.running)
    await module.suspend()
    expect(module.deviceState.value).toBe(PlaybackState.suspended)
    module.destroy()
  })

  it('owns the backend it was given', () => {
    const backend = new NullAudioBackend()
    const module = new PlaybackModule({ backend })
    const game = new TestGame([module])
    game.start()
    game.stop()
    game.destroy()

    expect(backend.destroyed).toBe(true)
  })

  it('rejects settings that cannot be mixed', () => {
    const backend = new NullAudioBackend()

    expect(() => new PlaybackModule({ backend, masterVolume: -1 })).toThrow(/master volume/)
    expect(() => new PlaybackModule({ backend, maxVoices: 1.5 })).toThrow(/voice limit/)
  })

  it('keeps the frame running when the device fails', () => {
    const backend = new FailingBackend()
    const music = new AudioPlayer({ clip, autoplay: true })
    const module = new PlaybackModule({ backend, entries: [music] })

    expect(() => {
      update(module)
    }).not.toThrow()
    expect(module.error.value?.message).toMatch(/not available/)
    expect(module.voices.value).toHaveLength(0)

    backend.failing = false
    update(module)

    expect(module.error.value).toBeUndefined()
    expect(module.voices.value).toHaveLength(1)
    module.destroy()
  })
})
