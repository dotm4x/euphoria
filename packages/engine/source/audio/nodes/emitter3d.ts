import { type ReadOnlySignal } from '#/core/events/signal.js'
import { type ReadOnlyStore, type Store } from '#/core/events/store.js'
import { Node3D, type Node3DOptions } from '#/math/nodes/node3d.js'
import { Vector3 } from '#/math/primitives/vectors/vector3.js'

import { type VoiceState } from '../descriptors/frame.js'
import { type PlaybackDescriptor } from '../descriptors/playback.js'
import { type Playable } from '../interfaces/playable.js'
import { type Attenuation } from '../primitives/attenuation.js'
import { AudioSpace } from '../primitives/space.js'
import { type AudioClip } from '../resources/clip.js'

import { AudioVoice, type AudioVoiceOptions } from './voice.js'

/** Configuration for a sound placed in space. */
export interface AudioEmitter3DOptions extends AudioVoiceOptions, Node3DOptions {}

/**
 * A sound placed in space.
 *
 * Added as a child of a body, a mesh or a camera, it inherits their transform:
 * the emitter never computes a position of its own. The module hands the frame
 * to the backend, which turns distance into gain and direction into panning.
 */
export class AudioEmitter3D extends Node3D implements Playable {
  private readonly _voice: AudioVoice

  /**
   * @param options - Node and voice settings of the emitter.
   */
  public constructor(options: AudioEmitter3DOptions = {}) {
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

  /** Priority used when the module limits how many voices sound at once. */
  public get priority(): Store<number> {
    return this._voice.priority
  }

  /** Whether the emitter is sounding. */
  public get playing(): ReadOnlyStore<boolean> {
    return this._voice.playing
  }

  /** Fired when the clip ends and the emitter is not looping. */
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
    const basis = this.globalBasis

    return this._voice.describe({
      identifier: this.identifier,
      space: AudioSpace.spatial,
      position: this.globalPosition,
      forward: new Vector3(basis.forward.x, basis.forward.y, basis.forward.z),
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
