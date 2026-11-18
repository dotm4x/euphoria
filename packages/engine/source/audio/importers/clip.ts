import { fetchSource } from '#/modules/assets/helpers/fetch.js'
import { AssetImporter, type ImportedAsset } from '#/modules/assets/importer.js'

import { AudioClip } from '../resources/clip.js'

/** Metadata a container states without decoding it. */
interface ClipMetadata {
  readonly duration?: number
  readonly channels?: number
  readonly sampleRate?: number
}

/**
 * Loads encoded audio into clips the playback backend can decode.
 *
 * Supports MP3, OGG and WAV. Nothing is decoded here: the clip keeps the bytes,
 * so importing does not need an audio device and a game can load sound where
 * nothing can play it, such as a server or a test.
 */
export class AudioClipImporter extends AssetImporter<AudioClip> {
  public constructor() {
    super({ identifier: 'audio', extensions: ['mp3', 'ogg', 'wav'] })
  }

  /** @inheritDoc */
  public override async load(
    source: string,
    signal: AbortSignal,
  ): Promise<ImportedAsset<AudioClip>> {
    const response = await fetchSource(source, signal)
    const data = await response.arrayBuffer()
    signal.throwIfAborted()

    return {
      value: new AudioClip({
        data,
        type: response.headers.get('content-type') ?? '',
        source,
        ...describeWave(data),
      }),
    }
  }
}

/**
 * Reads the duration, channels and sample rate of a WAV file.
 *
 * Compressed formats do not state these values in a fixed header, so they stay
 * unknown until the backend decodes the clip.
 *
 * @param data - Encoded bytes of the clip.
 * @returns The metadata the container states, or an empty object.
 */
function describeWave(data: ArrayBuffer): ClipMetadata {
  if (data.byteLength < 44) return {}

  const view = new DataView(data)
  if (readTag(view, 0) !== 'RIFF' || readTag(view, 8) !== 'WAVE') return {}

  let offset = 12
  let channels: number | undefined
  let sampleRate: number | undefined
  let byteRate: number | undefined
  while (offset + 8 <= data.byteLength) {
    const tag = readTag(view, offset)
    const size = view.getUint32(offset + 4, true)
    const body = offset + 8
    if (tag === 'fmt ' && body + 16 <= data.byteLength) {
      channels = view.getUint16(body + 2, true)
      sampleRate = view.getUint32(body + 4, true)
      byteRate = view.getUint32(body + 8, true)
    }

    if (tag === 'data' && byteRate !== undefined && byteRate > 0) {
      return {
        duration: Math.min(size, data.byteLength - body) / byteRate,
        ...(channels === undefined ? {} : { channels }),
        ...(sampleRate === undefined ? {} : { sampleRate }),
      }
    }

    offset = body + size + (size % 2)
  }

  return {
    ...(channels === undefined ? {} : { channels }),
    ...(sampleRate === undefined ? {} : { sampleRate }),
  }
}

function readTag(view: DataView, offset: number): string {
  let tag = ''
  for (let index = 0; index < 4; index++) {
    tag += String.fromCharCode(view.getUint8(offset + index))
  }

  return tag
}
