import {
  Attenuation,
  type AudioClip,
  AudioEmitter2D,
  AudioListener2D,
  AudioPlayer,
  AudioSpace,
  Camera2D,
  Color,
  type GraphicMaterial,
  Node2D,
  PlaybackModule,
  RectNode,
  type Updatable,
  type UpdateContext,
  Vector2,
  Vector3,
} from '@euphoria/engine'

import { PlaygroundInputModule } from '../runtime/input/module.js'

import { audioReadouts, bindAudioControls } from './audio-controls.js'

/** Distance from the centre at which the sounding squares travel. */
const orbitRadius = 130

/** Size of the squares that carry a sound. */
const squareSize = 36

/** Size of the board, in local units. */
const boardSize = 520

/** Colors of the three sounding squares. */
const tints: readonly Color[] = [
  new Color(0.98, 0.55, 0.4, 1),
  new Color(0.45, 0.85, 0.6, 1),
  new Color(0.5, 0.7, 0.98, 1),
]

/** Clips the scene plays. */
export interface AudioScene2DClips {
  /** Looping track. */
  readonly music: AudioClip
  /** Short sound played on demand. */
  readonly coin: AudioClip
  /** Lower sound played on demand. */
  readonly thud: AudioClip
  /** Tone looped by the orbiting emitters. */
  readonly beep: AudioClip
}

/** Configuration for the two-dimensional audio scene. */
export interface AudioScene2DOptions {
  /** Clips the scene plays. */
  readonly clips: AudioScene2DClips
  /** Material the squares are drawn with. */
  readonly material: GraphicMaterial
}

/**
 * Shows how a game sounds on a plane.
 *
 * Squares orbit the
 * camera and each carries a looping emitter, so the stereo pan follows what you
 * see. Planar emitters measure distance on the plane and pan from left to right.
 */
export class AudioScene2D extends Node2D implements Updatable {
  public readonly camera: Camera2D

  private readonly _clips: AudioScene2DClips
  private readonly _music: AudioPlayer
  private readonly _orbiters: Node2D[] = []
  private _playback: PlaybackModule | undefined
  private _elapsed: number = 0

  /**
   * @param options - Clips to play and the material of the squares.
   */
  public constructor({ clips, material }: AudioScene2DOptions) {
    const camera = new Camera2D({ name: 'camera' })
    camera.add(new AudioListener2D({ name: 'listener' }))

    const orbiters: Node2D[] = []
    for (let index = 0; index < 3; index++) {
      const orbiter = new Node2D({ name: `orbiter-${String(index)}` })
      orbiter.add(
        new RectNode({
          material,
          size: new Vector2(squareSize, squareSize),
          modulate: tints[index % tints.length] ?? Color.white,
        }),
      )
      orbiter.add(
        new AudioEmitter2D({
          name: 'tone',
          clip: clips.beep,
          loop: true,
          autoplay: true,
          volume: 0.35,
          bus: 'sfx',
          attenuation: new Attenuation({ minimumDistance: 40, maximumDistance: 400 }),
        }),
      )
      orbiters.push(orbiter)
    }

    const music = new AudioPlayer({
      name: 'music',
      clip: clips.music,
      loop: true,
      autoplay: true,
      volume: 0.7,
      bus: 'music',
    })

    super({
      name: 'audio2d',
      children: [
        new RectNode({
          name: 'board',
          material,
          size: new Vector2(boardSize, boardSize),
          modulate: new Color(0.1, 0.13, 0.19, 1),
        }),
        camera,
        ...orbiters,
        music,
      ],
    })

    this.camera = camera
    this._clips = clips
    this._music = music
    this._orbiters = orbiters
  }

  /** @inheritDoc */
  public update({ deltaTime }: UpdateContext): void {
    this._elapsed += deltaTime
    for (const [index, orbiter] of this._orbiters.entries()) {
      const angle = this._elapsed * 0.7 + (index * Math.PI * 2) / this._orbiters.length
      orbiter.position.value = new Vector2(
        Math.cos(angle) * orbitRadius,
        Math.sin(angle) * orbitRadius,
      )
    }
  }

  /** Values the statistics panel shows for this scene. */
  public readouts(): Iterable<readonly [string, string]> {
    return audioReadouts(this._playback, this._music)
  }

  /** @inheritDoc */
  protected override configure(): void {
    const { keyboard } = this.require(PlaygroundInputModule)
    this._playback = this.require<PlaybackModule>(PlaybackModule)
    bindAudioControls({
      keyboard,
      playback: this._playback,
      music: this._music,
      coin: this._clips.coin,
      thud: this._clips.thud,
      place: () => {
        const angle = this._elapsed * 1.7

        return {
          space: AudioSpace.planar,
          position: new Vector3(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius, 0),
          volume: 0.8,
          bus: 'sfx',
        }
      },
    })
  }
}
