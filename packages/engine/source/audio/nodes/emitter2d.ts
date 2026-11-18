import { type ReadOnlySignal } from '#/core/events/signal.js'
import { type ReadOnlyStore, type Store } from '#/core/events/store.js'
import { Node2D, type Node2DOptions } from '#/math/nodes/node2d.js'
import { Vector3 } from '#/math/primitives/vectors/vector3.js'

import { type VoiceState } from '../descriptors/frame.js'
import { type PlaybackDescriptor } from '../descriptors/playback.js'
import { type Playable } from '../interfaces/playable.js'
import { type Attenuation } from '../primitives/attenuation.js'
import { AudioSpace } from '../primitives/space.js'
import { type AudioClip } from '../resources/clip.js'

import { AudioVoice, type AudioVoiceOptions } from './voice.js'

/** Configuration for a sound placed on a plane. */
export interface AudioEmitter2DOptions extends AudioVoiceOptions, Node2DOptions {}

/**
 * A sound placed on a plane.
 *
 * Its position comes from the node it hangs from, so an emitter added to a
 * moving body follows it without any synchronization. The playback module reads
 * the position and the backend turns distance into gain and direction into pan.
 */
export class AudioEmitter2D extends Node2D implements Playable {
  private readonly _voice: AudioVoice

  /**
   * @param options - Node and voice settings of the emitter.
   */
  public constructor(options: AudioEmitter2DOptions = {}) {
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

  /** Clip the emitter sounds; undefined keeps it silent. */
  public get source(): Store<AudioClip | undefined> {
    return this._voice.clip
  }

  /** Gain of the emitter, applied before the distance curve. */
  public get volume(): Store<number> {
    return this._voice.volume
  }

  /** Playback rate of the emitter. */
  public get pitch(): Store<number> {
    return this._voice.pitch
  }

  /** Whether the emitter restarts when the clip ends. */
  public get loop(): Store<boolean> {
    return this._voice.loop
  }

  /** Identifier of the bus the emitter routes into. */
  public get bus(): Store<string> {
    return this._voice.bus
  }

  /** Distance curve of the emitter. */
  public get attenuation(): Store<Attenuation> {
    return this._voice.attenuation
  }

  /** Whether the emitter is sounding. */
  public get playing(): ReadOnlyStore<boolean> {
    return this._voice.playing
  }

  /** Fired when the clip reaches its end and the emitter is not looping. */
  public get onFinished(): ReadOnlySignal<[]> {
    return this._voice.onFinished
  }

  /**
   * Starts or restarts the emitter.
   *
   * @param offset - Second of the clip to start at; defaults to the current one.
   */
  public play(offset?: number): void {
    this._voice.play(offset)
  }

  /** Stops the emitter and rewinds it. */
  public stop(): void {
    this._voice.stop()
  }

  /**
   * Moves the emitter to a second of its clip.
   *
   * @param offset - Second of the clip to continue from.
   */
  public seek(offset: number): void {
    this._voice.seek(offset)
  }

  /** @inheritDoc */
  public describe(): PlaybackDescriptor | undefined {
    const position = this.globalPosition
    const rotation = this.globalRotation

    return this._voice.describe({
      identifier: this.identifier,
      space: AudioSpace.planar,
      position: new Vector3(position.x, position.y, 0),
      forward: new Vector3(Math.cos(rotation), Math.sin(rotation), 0),
    })
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
