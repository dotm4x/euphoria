import {
  Attenuation,
  type AudioClip,
  AudioEmitter3D,
  AudioListener3D,
  AudioPlayer,
  Camera3D,
  Color,
  createPlaneMesh,
  createSphereMesh,
  DirectionalLight3D,
  Environment3D,
  type GraphicMaterial,
  LightEnvironment,
  MeshInstance3D,
  Node3D,
  OmniLight3D,
  PlaybackModule,
  type Updatable,
  type UpdateContext,
  Vector2,
  Vector3,
} from '@euphoria/engine'

import { PlaygroundInputModule } from '../runtime/input/module.js'

import { audioReadouts, bindAudioControls } from './audio-controls.js'

/** Distance from the centre at which the sounding spheres travel. */
const orbitRadius = 3

/** Radius of the spheres that carry a sound. */
const sphereRadius = 0.45

/** Colors of the three sounding spheres. */
const tints: readonly Color[] = [
  new Color(0.98, 0.55, 0.4, 1),
  new Color(0.45, 0.85, 0.6, 1),
  new Color(0.5, 0.7, 0.98, 1),
]

/** Clips the scene plays. */
export interface AudioScene3DClips {
  /** Looping track. */
  readonly music: AudioClip
  /** Short sound played on demand. */
  readonly coin: AudioClip
  /** Lower sound played on demand. */
  readonly thud: AudioClip
  /** Tone looped by the orbiting emitters. */
  readonly beep: AudioClip
}

/** Configuration for the three-dimensional audio scene. */
export interface AudioScene3DOptions {
  /** Clips the scene plays. */
  readonly clips: AudioScene3DClips
  /** Material the spheres are drawn with. */
  readonly material: GraphicMaterial
}

/**
 * Shows how a game sounds in space.
 *
 * Three spheres orbit a lit floor, each carrying a looping emitter, so what you
 * see is where the sound comes from. The music loops on its own bus. Nothing in
 * this scene computes a distance: an emitter inherits the transform of the node
 * it hangs from, and the backend turns that into gain and panning.
 */
export class AudioScene3D extends Node3D implements Updatable {
  public readonly camera: Camera3D

  private readonly _clips: AudioScene3DClips
  private readonly _music: AudioPlayer
  private readonly _orbiters: Node3D[] = []
  private _playback: PlaybackModule | undefined
  private _elapsed: number = 0

  /**
   * @param options - Clips to play and the material of the spheres.
   */
  public constructor({ clips, material }: AudioScene3DOptions) {
    const camera = new Camera3D({
      name: 'camera',
      position: new Vector3(0, 4.2, 8.5),
      rotation: new Vector3(-0.36, 0, 0),
    })
    camera.add(new AudioListener3D({ name: 'listener' }))

    const orbiters: Node3D[] = []
    for (let index = 0; index < 3; index++) {
      const orbiter = new Node3D({ name: `orbiter-${String(index)}` })
      orbiter.add(
        new MeshInstance3D({
          material,
          mesh: createSphereMesh(sphereRadius, 16, 24),
          modulate: tints[index % tints.length] ?? Color.white,
        }),
      )
      orbiter.add(
        new AudioEmitter3D({
          name: 'tone',
          clip: clips.beep,
          loop: true,
          autoplay: true,
          volume: 0.35,
          bus: 'sfx',
          attenuation: new Attenuation({ minimumDistance: 1, maximumDistance: 12 }),
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
      name: 'audio3d',
      children: [
        new Environment3D({
          name: 'environment',
          environment: new LightEnvironment({ ambient: new Color(0.3, 0.33, 0.4, 1) }),
          children: [
            new DirectionalLight3D({ name: 'sun', rotation: new Vector3(-0.9, 0.6, 0) }),
            new OmniLight3D({
              name: 'lamp',
              color: new Color(0.5, 0.7, 1, 1),
              range: 12,
              position: new Vector3(0, 3, 0),
            }),
            new MeshInstance3D({
              name: 'floor',
              material,
              mesh: createPlaneMesh(new Vector2(18, 18)),
              modulate: new Color(0.34, 0.37, 0.45, 1),
            }),
            camera,
            ...orbiters,
          ],
        }),
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
      orbiter.position.value = new Vector3(
        Math.cos(angle) * orbitRadius,
        sphereRadius + 0.05,
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
          position: new Vector3(Math.cos(angle) * orbitRadius, 0.5, Math.sin(angle) * orbitRadius),
          volume: 0.8,
          bus: 'sfx',
        }
      },
    })
  }
}
