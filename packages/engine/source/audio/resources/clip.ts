import { Resource } from '#/core/primitives/resource.js'

/** Configuration for an audio clip. */
export interface AudioClipOptions {
  /** Encoded bytes of the clip, ready for the backend to decode. */
  readonly data: ArrayBuffer
  /** Media type of the bytes, such as `audio/ogg`; empty when it is unknown. */
  readonly type?: string
  /** Source the bytes came from, used in diagnostics. */
  readonly source?: string
  /** Duration in seconds, when the format states it without decoding. */
  readonly duration?: number
  /** Channel count, when the format states it without decoding. */
  readonly channels?: number
  /** Sample rate in hertz, when the format states it without decoding. */
  readonly sampleRate?: number
}

/**
 * Encoded sound that a playback backend decodes.
 *
 * The clip keeps the bytes and whatever metadata the container states, so a
 * game describes sound with no device involved: assets, the editor and tests
 * can hold a clip without a Web Audio context.
 */
export class AudioClip extends Resource {
  /** Encoded bytes of the clip. */
  public readonly data: ArrayBuffer

  /** Media type of the bytes, or an empty string when it is unknown. */
  public readonly type: string

  /** Source the bytes came from. */
  public readonly source: string

  /** Duration in seconds, when the format states it. */
  public readonly duration: number | undefined

  /** Channel count, when the format states it. */
  public readonly channels: number | undefined

  /** Sample rate in hertz, when the format states it. */
  public readonly sampleRate: number | undefined

  /**
   * @param options - Encoded bytes and the metadata the container states.
   * @throws {@link Error} If the bytes are empty.
   */
  public constructor({
    data,
    type = '',
    source = '',
    duration,
    channels,
    sampleRate,
  }: AudioClipOptions) {
    super()
    if (data.byteLength === 0) {
      throw new Error('An audio clip cannot be created from empty bytes.')
    }

    this.data = data
    this.type = type
    this.source = source
    this.duration = duration
    this.channels = channels
    this.sampleRate = sampleRate
  }
}
