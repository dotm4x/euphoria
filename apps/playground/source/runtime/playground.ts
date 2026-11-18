import {
  type AssetsModule,
  type Color,
  Game,
  type RenderBackend,
  type SimulationBackend,
  type Updatable,
  type UpdateContext,
} from '@euphoria/engine'

import { PlaygroundInputModule } from './input/module.js'
import { PlaygroundPlaybackModule } from './playback/module.js'
import { PlaygroundRendererModule } from './renderer/module.js'
import { type StoryScene } from './scene.js'
import { PlaygroundScenesModule } from './scenes/module.js'
import { PlaygroundSimulationModule } from './simulation/module.js'
import { type RuntimeStats } from './stats.js'
import { PlaygroundTimeModule } from './time/module.js'

/** Configuration for the playground engine. */
export interface PlaygroundOptions {
  /** Backend that draws the scene, owned by the renderer module. */
  readonly backend: RenderBackend
  /** Assets module the story already loaded its materials with. */
  readonly assets: AssetsModule
  /** Scene to run. */
  readonly scene: StoryScene
  /** Simulation backends, owned by the simulation module. */
  readonly physics: readonly SimulationBackend[]
  /** Background the canvas is cleared with. */
  readonly background?: Color | undefined
  /** Receives the metrics of every rendered frame. */
  readonly onStats?: ((stats: RuntimeStats) => void) | undefined
}

const fpsWindow = 500

/**
 * Wires the modules of the playground around one scene.
 *
 * The game only creates the modules and yields them: every module composes its
 * own components and declares the modules it needs, so replacing one of them is
 * a change in this list and nothing else.
 */
export class Playground extends Game implements Updatable {
  private readonly _scene: StoryScene
  private readonly _onStats: ((stats: RuntimeStats) => void) | undefined
  private _frames: number = 0
  private _deltaTime: number = 0
  private _fps: number = 0
  private _windowFrames: number = 0
  private _windowStart: number = performance.now()

  /** Assets the story loads textures and shaders with. */
  public readonly assets: AssetsModule

  /** Input devices the scenes bind. */
  public readonly input: PlaygroundInputModule

  /** Renderer that draws the active scene. */
  public readonly renderer: PlaygroundRendererModule

  /** Playback module that sounds the story. */
  public readonly playback: PlaygroundPlaybackModule

  /** Scenes module that owns the story scene. */
  public readonly scenes: PlaygroundScenesModule

  /** Simulation that steps the story bodies. */
  public readonly simulation: PlaygroundSimulationModule

  /** Time module that drives the update loop. */
  public readonly time: PlaygroundTimeModule

  /**
   * @param options - Story scene, already loaded assets, backend and statistics sink.
   */
  public constructor({ backend, assets, scene, physics, background, onStats }: PlaygroundOptions) {
    super()
    this._scene = scene
    this._onStats = onStats
    this.assets = assets
    this.scenes = new PlaygroundScenesModule(scene.node, scene.camera)
    this.simulation = new PlaygroundSimulationModule({ scene, physics })
    this.time = new PlaygroundTimeModule({ game: this })
    this.input = new PlaygroundInputModule()
    this.playback = new PlaygroundPlaybackModule({ scene: scene.node, muted: false })
    this.renderer = new PlaygroundRendererModule({ backend, background })
  }

  /** Scene description published by the render benchmark, when requested. */
  public get benchmark(): StoryScene['benchmark'] {
    return this._scene.benchmark
  }

  /** Metrics of the latest rendered frame. */
  public get stats(): RuntimeStats {
    const backend = this.renderer.backend

    return {
      frames: this._frames,
      deltaTime: this._deltaTime,
      drawCalls: backend.stats.drawCalls,
      commands: backend.stats.commands,
      fps: this._fps,
      readouts: [...(this._scene.readouts?.() ?? [])],
    }
  }

  /** @inheritDoc */
  public update(context: UpdateContext): void {
    this.renderer.update(context)
    this._frames++
    this._deltaTime = context.deltaTime
    this.measure()
    this._onStats?.(this.stats)
  }

  protected override *compose(): Generator<PlaygroundModule, void, unknown> {
    yield this.time
    yield this.scenes
    yield this.input
    yield this.simulation
    yield this.playback
    yield this.renderer
    yield this.assets
  }

  private measure(): void {
    this._windowFrames++
    const now = performance.now()
    const elapsed = now - this._windowStart
    if (elapsed < fpsWindow) return
    this._fps = (this._windowFrames * 1000) / elapsed
    this._windowFrames = 0
    this._windowStart = now
  }
}

type PlaygroundModule =
  | PlaygroundTimeModule
  | PlaygroundScenesModule
  | PlaygroundInputModule
  | PlaygroundSimulationModule
  | PlaygroundPlaybackModule
  | PlaygroundRendererModule
  | AssetsModule
