import { afterEach, describe, expect, it, vi } from 'vitest'

import { AudioClip, AudioClipImporter } from '../../../source/index.js'

interface WaveOptions {
  readonly seconds?: number
  readonly sampleRate?: number
  readonly channels?: number
}

function createWave({
  seconds = 1,
  sampleRate = 8000,
  channels = 1,
}: WaveOptions = {}): ArrayBuffer {
  const byteRate = sampleRate * channels * 2
  const dataSize = byteRate * seconds
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  const tag = (offset: number, value: string): void => {
    for (let index = 0; index < value.length; index++) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }

  tag(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  tag(8, 'WAVE')
  tag(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  tag(36, 'data')
  view.setUint32(40, dataSize, true)

  return buffer
}

describe('AudioClipImporter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('supports the compressed and uncompressed formats of the engine', () => {
    expect(new AudioClipImporter().extensions).toEqual(['.mp3', '.ogg', '.wav'])
  })

  it('keeps the bytes and the media type of the source', async () => {
    const bytes = createWave()
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(bytes, { headers: { 'content-type': 'audio/wav' } })),
    )
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    const { value } = await new AudioClipImporter().load('sound.wav', controller.signal)

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('sound.wav', { signal: controller.signal })
    expect(value).toBeInstanceOf(AudioClip)
    expect(value.type).toBe('audio/wav')
    expect(value.source).toBe('sound.wav')
    expect(value.data.byteLength).toBe(bytes.byteLength)
  })

  it('reads the metadata a wave file states', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(createWave({ seconds: 2, sampleRate: 22050, channels: 2 }))),
      ),
    )

    const { value } = await new AudioClipImporter().load('music.wav', new AbortController().signal)

    expect(value.duration).toBeCloseTo(2)
    expect(value.channels).toBe(2)
    expect(value.sampleRate).toBe(22050)
  })

  it('leaves the metadata unknown for compressed formats', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('not a wave file'))),
    )

    const { value } = await new AudioClipImporter().load('song.mp3', new AbortController().signal)

    expect(value.duration).toBeUndefined()
    expect(value.channels).toBeUndefined()
  })

  it('rejects unsuccessful responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('missing', { status: 404 }))),
    )

    await expect(
      new AudioClipImporter().load('missing.ogg', new AbortController().signal),
    ).rejects.toThrow('status 404')
  })

  it('propagates aborted requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((source: string, init?: RequestInit) =>
        init?.signal?.aborted === true
          ? Promise.reject(new DOMException(`Loading '${source}' was aborted.`, 'AbortError'))
          : Promise.resolve(new Response(source)),
      ),
    )
    const controller = new AbortController()
    controller.abort()

    await expect(new AudioClipImporter().load('sound.wav', controller.signal)).rejects.toThrow(
      'aborted',
    )
  })

  it('rejects empty audio', () => {
    expect(() => new AudioClip({ data: new ArrayBuffer(0) })).toThrow(/empty/)
  })
})
