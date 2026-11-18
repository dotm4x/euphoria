import { describe, expect, it } from 'vitest'

import {
  Attenuation,
  AudioClip,
  AudioSpace,
  ListenerDescriptor,
  PlaybackDescriptor,
  PlaybackState,
  Vector3,
  WebAudioBackend,
} from '../../../../../source/index.js'

/** Audio parameter that records what the backend writes into it. */
class FakeParam {
  public values: number[] = []
  public value: number = 0

  public setValueAtTime(value: number): void {
    this.values.push(value)
  }
}

/** Node of the fake graph, which remembers how it is wired. */
class FakeNode {
  public readonly connections: FakeNode[] = []

  public connect(target: FakeNode): void {
    this.connections.push(target)
  }

  public disconnect(): void {
    this.connections.length = 0
  }
}

class FakeGain extends FakeNode {
  public readonly gain: FakeParam = new FakeParam()
}

class FakeSource extends FakeNode {
  public buffer: unknown = undefined
  public loop: boolean = false
  public readonly playbackRate: FakeParam = new FakeParam()
  public readonly offsets: number[] = []
  public onended: (() => void) | null = null
  public stopped: boolean = false

  public start(_when: number, offset: number): void {
    this.offsets.push(offset)
  }

  public stop(): void {
    this.stopped = true
  }

  public end(): void {
    this.onended?.()
  }
}

/** Panner that can emulate a browser without the audio param API. */
class FakePanner extends FakeNode {
  public readonly positionX: FakeParam = new FakeParam()
  public readonly positionY: FakeParam = new FakeParam()
  public readonly positionZ: FakeParam = new FakeParam()
  public readonly orientationX: FakeParam = new FakeParam()
  public readonly orientationY: FakeParam = new FakeParam()
  public readonly orientationZ: FakeParam = new FakeParam()
  public readonly placed: number[][] = []
  public readonly oriented: number[][] = []
  public panningModel: string = ''
  public distanceModel: string = ''
  public refDistance: number = 0
  public maxDistance: number = 0
  public rolloffFactor: number = 1

  public setPosition(x: number, y: number, z: number): void {
    this.placed.push([x, y, z])
  }

  public setOrientation(x: number, y: number, z: number): void {
    this.oriented.push([x, y, z])
  }
}

class FakeStereoPanner extends FakeNode {
  public readonly pan: FakeParam = new FakeParam()
}

/** Listener that can emulate a browser without the audio param API. */
class FakeListener {
  public readonly positionX: FakeParam = new FakeParam()
  public readonly positionY: FakeParam = new FakeParam()
  public readonly positionZ: FakeParam = new FakeParam()
  public readonly forwardX: FakeParam = new FakeParam()
  public readonly forwardY: FakeParam = new FakeParam()
  public readonly forwardZ: FakeParam = new FakeParam()
  public readonly upX: FakeParam = new FakeParam()
  public readonly upY: FakeParam = new FakeParam()
  public readonly upZ: FakeParam = new FakeParam()
  public readonly placed: number[][] = []
  public readonly oriented: number[][] = []

  public setPosition(x: number, y: number, z: number): void {
    this.placed.push([x, y, z])
  }

  public setOrientation(
    fx: number,
    fy: number,
    fz: number,
    ux: number,
    uy: number,
    uz: number,
  ): void {
    this.oriented.push([fx, fy, fz, ux, uy, uz])
  }
}

class FakeContext {
  public currentTime: number = 0
  public state: 'suspended' | 'running' | 'closed' = 'suspended'
  public readonly listener: FakeListener = new FakeListener()
  public readonly destination: FakeNode = new FakeNode()
  public readonly sources: FakeSource[] = []
  public readonly panners: FakePanner[] = []
  public readonly pans: FakeStereoPanner[] = []
  public readonly gains: FakeGain[] = []
  public decodeCount: number = 0
  public closed: boolean = false

  public createGain(): FakeGain {
    const gain = new FakeGain()
    this.gains.push(gain)

    return gain
  }

  public createBufferSource(): FakeSource {
    const source = new FakeSource()
    this.sources.push(source)

    return source
  }

  public createPanner(): FakePanner {
    const panner = new FakePanner()
    this.panners.push(panner)

    return panner
  }

  public createStereoPanner(): FakeStereoPanner {
    const panner = new FakeStereoPanner()
    this.pans.push(panner)

    return panner
  }

  public decodeAudioData(): Promise<{ duration: number }> {
    this.decodeCount++

    return Promise.resolve({ duration: 2 })
  }

  public resume(): Promise<void> {
    this.state = 'running'

    return Promise.resolve()
  }

  public suspend(): Promise<void> {
    this.state = 'suspended'

    return Promise.resolve()
  }

  public close(): Promise<void> {
    this.closed = true
    this.state = 'closed'

    return Promise.resolve()
  }
}

const clip = new AudioClip({ data: new ArrayBuffer(8) })
const listener = new ListenerDescriptor()

function createBackend(): { backend: WebAudioBackend; context: FakeContext } {
  const context = new FakeContext()

  return {
    backend: new WebAudioBackend({ context: context as unknown as AudioContext }),
    context,
  }
}

function voice(options: Partial<ConstructorParameters<typeof PlaybackDescriptor>[0]> = {}) {
  return new PlaybackDescriptor({ identifier: 'voice', clip, ...options })
}

function frame(voices: readonly PlaybackDescriptor[], muted: boolean = false) {
  return { listener, voices, buses: [], masterVolume: 0.5, muted }
}

describe('WebAudioBackend', () => {
  it('decodes a clip once and remembers its duration', async () => {
    const { backend, context } = createBackend()

    await backend.decode(clip)
    await backend.decode(clip)

    expect(context.decodeCount).toBe(1)
    expect(backend.duration(clip)).toBe(2)
    expect(backend.stats.clips).toBe(1)
    backend.destroy()
  })

  it('starts a voice for every placed sound', async () => {
    const { backend, context } = createBackend()
    await backend.decode(clip)

    backend.sync(frame([voice({ offset: 0.5 })]))

    expect(context.sources).toHaveLength(1)
    expect(context.sources[0]?.offsets).toEqual([0.5])
    expect(context.gains[0]?.gain.value).toBeCloseTo(0.5)
    expect(backend.stats.voices).toBe(1)
    backend.destroy()
  })

  it('wires the voice into the master bus so it is actually heard', async () => {
    const { backend, context } = createBackend()
    await backend.decode(clip)

    backend.sync(frame([voice()]))

    const master = context.gains[0]
    const voiceGain = context.gains[1]
    expect(context.destination.connections.length).toBe(0)
    expect(master?.connections).toEqual([context.destination])
    expect(voiceGain?.connections).toEqual([master])
    backend.destroy()
  })

  it('routes a voice into the bus it asks for', async () => {
    const { backend, context } = createBackend()
    await backend.decode(clip)

    backend.sync({
      ...frame([voice({ bus: 'sfx' })]),
      buses: [{ identifier: 'sfx', volume: 1, muted: false, parent: 'master', equals: () => true }],
    })

    const bus = context.gains[1]
    expect(bus?.connections).toEqual([context.gains[0]])
    expect(context.gains[2]?.connections).toEqual([bus])
    backend.destroy()
  })

  it('fades a placed voice with the distance to the listener', async () => {
    const { backend, context } = createBackend()
    await backend.decode(clip)
    const attenuation = new Attenuation({ minimumDistance: 1, maximumDistance: 10 })

    backend.sync(
      frame([
        voice({
          space: AudioSpace.spatial,
          position: new Vector3(0, 0, 5),
          attenuation,
        }),
      ]),
    )

    expect(context.gains[1]?.gain.value).toBeCloseTo(0.2)
    backend.destroy()
  })

  it('pans a planar voice with the side the listener hears it from', async () => {
    const { backend, context } = createBackend()
    await backend.decode(clip)

    backend.sync(frame([voice({ space: AudioSpace.planar, position: new Vector3(4, 0, 0) })]))

    expect(context.pans[0]?.pan.value).toBeCloseTo(1)
    backend.destroy()
  })

  it('places a spatial voice and the listener with the audio param API', async () => {
    const { backend, context } = createBackend()
    await backend.decode(clip)

    backend.sync(frame([voice({ space: AudioSpace.spatial, position: new Vector3(1, 2, 3) })]))

    expect(context.listener.positionX.values).toEqual([0])
    expect(context.panners[0]?.positionX.values).toEqual([1])
    expect(context.panners[0]?.positionY.values).toEqual([2])
    expect(context.panners[0]?.positionZ.values).toEqual([3])
    backend.destroy()
  })

  it('falls back to the deprecated setters when a browser has no params', async () => {
    const context = new FakeContext()
    const legacyListener = new FakeListener()
    Object.assign(context, {
      listener: Object.assign(legacyListener, {
        positionX: undefined,
        positionY: undefined,
        positionZ: undefined,
        forwardX: undefined,
        forwardY: undefined,
        forwardZ: undefined,
        upX: undefined,
        upY: undefined,
        upZ: undefined,
      }),
    })
    const backend = new WebAudioBackend({ context: context as unknown as AudioContext })
    await backend.decode(clip)
    const panner = backend

    const realCreatePanner = context.createPanner.bind(context)
    context.createPanner = () => {
      const created = realCreatePanner()
      Object.assign(created, {
        positionX: undefined,
        positionY: undefined,
        positionZ: undefined,
        orientationX: undefined,
        orientationY: undefined,
        orientationZ: undefined,
      })

      return created
    }

    expect(() => {
      panner.sync(frame([voice({ space: AudioSpace.spatial, position: new Vector3(1, 2, 3) })]))
    }).not.toThrow()
    expect(legacyListener.placed).toEqual([[0, 0, 0]])
    expect(context.panners[0]?.placed).toEqual([[1, 2, 3]])
    expect(context.sources).toHaveLength(1)
    backend.destroy()
  })

  it('reports the voices that reached their end', async () => {
    const { backend, context } = createBackend()
    await backend.decode(clip)
    backend.sync(frame([voice()]))
    const source = context.sources[0]

    source?.end()
    backend.advance(0.25)
    const result = backend.read()

    expect(result.voices).toEqual([{ identifier: 'voice', finished: true, elapsed: 0.25 }])
    expect(backend.stats.voices).toBe(0)
    backend.destroy()
  })

  it('stops the voices that leave the frame', async () => {
    const { backend, context } = createBackend()
    await backend.decode(clip)
    backend.sync(frame([voice()]))

    backend.sync(frame([]))

    expect(context.sources[0]?.stopped).toBe(true)
    expect(backend.stats.voices).toBe(0)
    backend.destroy()
  })

  it('does not restart a voice that already ended', async () => {
    const { backend, context } = createBackend()
    await backend.decode(clip)
    backend.sync(frame([voice()]))
    context.sources[0]?.end()

    backend.sync(frame([voice()]))

    expect(context.sources).toHaveLength(1)
    backend.destroy()
  })

  it('applies the master gain and mutes every voice at once', async () => {
    const { backend, context } = createBackend()
    await backend.decode(clip)

    backend.sync(frame([voice()], true))

    expect(context.gains[0]?.gain.value).toBe(0)
    backend.destroy()
  })

  it('follows the state of the device', async () => {
    const { backend, context } = createBackend()

    await backend.resume()
    expect(backend.state.value).toBe(PlaybackState.running)
    await backend.suspend()
    expect(backend.state.value).toBe(PlaybackState.suspended)
    backend.destroy()

    expect(context.closed).toBe(true)
  })
})
