import { type ReadOnlySignal } from '#/core/events/signal.js'
import { type ReadOnlyStore, type Store } from '#/core/events/store.js'
import { Node, type NodeOptions } from '#/core/node/node.js'

import { type VoiceState } from '../descriptors/frame.js'
import { type PlaybackDescriptor } from '../descriptors/playback.js'
import { type Playable } from '../interfaces/playable.js'
import { AudioSpace } from '../primitives/space.js'
import { type AudioClip } from '../resources/clip.js'

import { AudioVoice, type AudioVoiceOptions } from './voice.js'

/** Configuration for a source that is not placed in space. */
export interface AudioPlayerOptions extends AudioVoiceOptions, NodeOptions {}

/**
 * A sound that is heard everywhere at once, with no distance or panning.
 *
 * Music, interface sounds and voice-over use it. The node carries the state and
 * the playback module does the rest, so a player sounds the same whether the
 * game draws in two or three dimensions.
 */
export class AudioPlayer extends Node implements Playable {
  private readonly _voice: AudioVoice

  /**
   * @param options - Node and voice settings of the player.
   */
  public constructor(options: AudioPlayerOptions = {}) {
    const { clip, volume, pitch, loop, bus, attenuation, priority, autoplay, ...node } = options
    super(node)
    this._voice = new AudioVoice({
      clip,
      volume,
      pitch,
      loop,
      bus,
      attenuation,
      priority,
      autoplay,
    })
  }

  /** Clip the player sounds; undefined keeps it silent. */
  public get source(): Store<AudioClip | undefined> {
    return this._voice.clip
  }

  /** Gain of the player. */
  public get volume(): Store<number> {
    return this._voice.volume
  }

  /** Playback rate of the player. */
  public get pitch(): Store<number> {
    return this._voice.pitch
  }

  /** Whether the player restarts when the clip ends. */
  public get loop(): Store<boolean> {
    return this._voice.loop
  }

  /** Identifier of the bus the player routes into. */
  public get bus(): Store<string> {
    return this._voice.bus
  }

  /** Whether the player is sounding. */
  public get playing(): ReadOnlyStore<boolean> {
    return this._voice.playing
  }

  /** Fired when the clip reaches its end and the player is not looping. */
  public get onFinished(): ReadOnlySignal<[]> {
    return this._voice.onFinished
  }

  /**
   * Starts or restarts the player.
   *
   * @param offset - Second of the clip to start at; defaults to the current one.
   */
  public play(offset?: number): void {
    this._voice.play(offset)
  }

  /** Stops the player and rewinds it. */
  public stop(): void {
    this._voice.stop()
  }

  /**
   * Moves the player to a second of its clip.
   *
   * @param offset - Second of the clip to continue from.
   */
  public seek(offset: number): void {
    this._voice.seek(offset)
  }

  /** @inheritDoc */
  public describe(): PlaybackDescriptor | undefined {
    return this._voice.describe({ identifier: this.identifier, space: AudioSpace.none })
  }

  /** @inheritDoc */
  public notifyVoice(state: VoiceState): void {
    this._voice.notify(state)
  }

  protected override onDestroy(): void {
    this._voice.destroy()
    super.onDestroy()
  }
}
