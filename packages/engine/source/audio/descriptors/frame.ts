import { type BusDescriptor } from './bus.js'
import { type ListenerDescriptor } from './listener.js'
import { type PlaybackDescriptor } from './playback.js'

/** What a backend must be playing after a frame, in one value. */
export interface PlaybackFrame {
  /** Ear of the frame. */
  readonly listener: ListenerDescriptor
  /** Voices that must sound this frame. */
  readonly voices: readonly PlaybackDescriptor[]
  /** Buses that must exist this frame. */
  readonly buses: readonly BusDescriptor[]
  /** Gain applied to every voice; defaults to `1`. */
  readonly masterVolume: number
  /** Whether every voice is silenced. */
  readonly muted: boolean
}

/** Outcome of a voice for one frame. */
export interface VoiceState {
  /** Identifier of the voice. */
  readonly identifier: string
  /** Whether the voice reached its end during the frame. */
  readonly finished: boolean
  /** Seconds the voice has been sounding, as the backend counts them. */
  readonly elapsed: number
}

/** What a backend reports after advancing a frame. */
export interface PlaybackResult {
  /** State of the voices the backend knows about. */
  readonly voices: readonly VoiceState[]
}

/** Counters a backend reports about its device. */
export interface PlaybackStats {
  /** Voices currently sounding. */
  readonly voices: number
  /** Buses registered in the device. */
  readonly buses: number
  /** Decoded clips the device holds. */
  readonly clips: number
}
