import {
  type AssetManifest,
  type AssetProgress,
  type AssetsModule,
  type Color,
  type Dimension,
  type GraphicMaterial,
  RapierBackend2D,
  type RenderBackend,
  type SimulationBackend,
  WebGlBackend,
} from '@euphoria/engine'

import { PlaygroundAssetsModule } from './assets/module.js'
import { measureRender } from './benchmark.js'
import { createSceneMaterials, type SceneMaterials } from './materials.js'
import { Playground } from './playground.js'
import { type StoryScene } from './scene.js'
import { StatsPanel } from './stats.js'

/** Everything a story can build its scene with. */
export interface SceneContext {
  /** Backend that draws the scene. */
  readonly backend: RenderBackend
  /** Assets module that loads textures and shaders. */
  readonly assets: AssetsModule
  /** Canvas the scene is drawn into. */
  readonly canvas: HTMLCanvasElement
  /** Two-dimensional material sampling the shared texture. */
  readonly material: GraphicMaterial
  /** Two-dimensional material without a texture. */
  readonly material2D: GraphicMaterial
}

/** Configuration for a story runtime. */
export interface RuntimeOptions {
  /** Element that receives the canvas and the statistics panel. */
  readonly container: HTMLElement
  /** Builds the scene of the story, once its assets are available. */
  readonly scene: (context: SceneContext) => Promise<StoryScene> | StoryScene
  /** Dimensions that need a simulation backend; defaults to none. */
  readonly physics?: readonly Dimension[]
  /** Canvas width in pixels; defaults to `640`. */
  readonly width?: number
  /** Canvas height in pixels; defaults to `360`. */
  readonly height?: number
  /** Background the canvas is cleared with; defaults to black. */
  readonly background?: Color | undefined
  /** Assets loaded before the scene is built, with a progress bar while they load. */
  readonly preload?: AssetManifest | undefined
}

const defaultWidth = 640
const defaultHeight = 360

let mounted: PlaygroundRuntime | undefined

/**
 * Runs an engine instance for a story.
 *
 * Starting, pausing and disposing go through this class, so stories never deal
 * with the module graph and nothing survives a story switch.
 */
export class PlaygroundRuntime {
  private readonly _canvas: HTMLCanvasElement
  private readonly _game: Playground
  private readonly _materials: SceneMaterials
  private readonly _panel: StatsPanel
  private readonly _resume: () => void
  private _state: 'idle' | 'running' | 'paused' = 'idle'

  private constructor(
    canvas: HTMLCanvasElement,
    panel: StatsPanel,
    game: Playground,
    materials: SceneMaterials,
  ) {
    this._canvas = canvas
    this._panel = panel
    this._game = game
    this._materials = materials
    this._panel.onToggle = () => this.toggle()
    // Browsers keep audio suspended until a gesture, and they may refuse the
    // first one, so every gesture retries until the device is running.
    this._resume = () => {
      if (this._game.playback.deviceState.value === 'running') return
      void this._game.playback.resume().catch(() => undefined)
    }

    window.addEventListener('pointerdown', this._resume)
    window.addEventListener('keydown', this._resume)
  }

  /** Engine of the story, for stories that need its modules. */
  public get game(): Playground {
    return this._game
  }

  /**
   * Creates the canvas, the engine and its statistics panel.
   *
   * @param options - Story scene, container, size and simulation backends.
   * @returns The runtime, ready to start.
   */
  public static async create(options: RuntimeOptions): Promise<PlaygroundRuntime> {
    const canvas = document.createElement('canvas')
    // The scenes that hit-test pointer positions look the canvas up by this id.
    canvas.id = 'game'
    canvas.width = options.width ?? defaultWidth
    canvas.height = options.height ?? defaultHeight
    canvas.style.cssText = [
      'display:block',
      'border:1px solid #2a2f3a',
      'border-radius:6px',
      'background:#0b0d12',
    ].join(';')
    options.container.append(canvas)

    const backend = new WebGlBackend({ canvas })
    const assets = new PlaygroundAssetsModule()
    if (options.preload !== undefined)
      await preloadAssets(options.container, assets, options.preload)
    const materials = await createSceneMaterials(backend, assets)
    const physics = await createPhysics(options.physics ?? [])
    const panel = new StatsPanel(options.container)
    const scene = await options.scene({
      backend,
      assets,
      canvas,
      material: materials.textured,
      material2D: materials.flat,
    })
    const game = new Playground({
      backend,
      assets,
      scene,
      physics,
      background: options.background,
      onStats: (stats) => {
        panel.update(stats)
      },
    })

    return new PlaygroundRuntime(canvas, panel, game, materials)
  }

  /** Starts the engine and its update loop. */
  public start(): void {
    if (this._state !== 'idle') return
    this._game.start()
    this._game.time.run()
    this._state = 'running'
    this.benchmark()
  }

  /** Stops the update loop, keeping the engine alive. */
  public pause(): void {
    if (this._state !== 'running') return
    this._game.stop()
    this._state = 'paused'
  }

  /** Restarts a paused engine. */
  public resume(): void {
    if (this._state !== 'paused') return
    this._game.start()
    this._game.time.run()
    this._state = 'running'
  }

  /**
   * Pauses a running engine or resumes a paused one.
   *
   * @returns Whether the engine is running afterwards.
   */
  public toggle(): boolean {
    if (this._state === 'running') this.pause()
    else this.resume()

    return this._state === 'running'
  }

  /** Stops the engine, releases its resources and removes its elements. */
  public dispose(): void {
    if (this._state === 'running') this._game.stop()
    this._state = 'idle'
    window.removeEventListener('pointerdown', this._resume)
    window.removeEventListener('keydown', this._resume)
    if (!this._game.destroyed) this._game.destroy()
    this._materials.dispose()
    this.releaseCanvas()
    this._panel.dispose()
  }

  private benchmark(): void {
    const benchmark = this._game.benchmark
    if (benchmark === undefined) return
    measureRender(
      this._game.renderer.backend,
      () => {
        this._game.renderer.render(1 / 60)
      },
      benchmark,
    )
  }

  private releaseCanvas(): void {
    const context = this._canvas.getContext('webgl2')
    context?.getExtension('WEBGL_lose_context')?.loseContext()
    this._canvas.remove()
  }
}

/**
 * Mounts a story runtime, disposing the previous one first.
 *
 * @param options - Story scene, container, size and simulation backends.
 * @returns The runtime that is now mounted.
 */
export async function mountRuntime(options: RuntimeOptions): Promise<PlaygroundRuntime> {
  disposeRuntime()
  mounted = await PlaygroundRuntime.create(options)
  mounted.start()

  return mounted
}

/** Disposes the mounted runtime, if any. */
export function disposeRuntime(): void {
  mounted?.dispose()
  mounted = undefined
}

async function createPhysics(dimensions: readonly Dimension[]): Promise<SimulationBackend[]> {
  return Promise.all(dimensions.map(() => RapierBackend2D.create()))
}

/**
 * Loads a manifest and shows how far it goes.
 *
 * The bar is part of the runtime, not of a story: a game that declares what it
 * needs before starting gets a loading screen for free, and the screen reports
 * the asset in flight and the ones that failed instead of a bare spinner.
 *
 * @param container - Element that receives the bar.
 * @param assets - Module that loads the assets.
 * @param manifest - Assets to load.
 */
async function preloadAssets(
  container: HTMLElement,
  assets: AssetsModule,
  manifest: AssetManifest,
): Promise<void> {
  const report = assets.loadAll(manifest)
  const overlay = document.createElement('div')
  overlay.style.cssText = 'color:#c9d1e4;font:13px/1.4 monospace;padding:0.5rem 0'
  const label = document.createElement('div')
  const bar = document.createElement('div')
  const fill = document.createElement('div')
  bar.style.cssText =
    'height:4px;background:#1b2030;border-radius:2px;overflow:hidden;margin-top:4px'
  fill.style.cssText = 'height:100%;width:0;background:#5ad1ff;transition:width 80ms linear'
  bar.append(fill)
  overlay.append(label, bar)
  container.append(overlay)
  const paint = (progress: AssetProgress): void => {
    label.textContent = describeProgress(progress)
    fill.style.width = `${(progress.ratio * 100).toFixed(0)}%`
  }

  paint(report.progress.value)
  const connection = report.progress.connect(({ value }) => {
    paint(value)
  })
  await report.finished
  connection.disconnect()
  overlay.remove()
}

function describeProgress(progress: AssetProgress): string {
  const head = `${progress.name}: ${String(progress.loaded)}/${String(progress.total)}`
  if (progress.failed > 0) return `${head} · ${String(progress.failed)} failed`
  if (progress.done) return `${head} · ready`
  if (progress.current === undefined) return head

  return `${head} · ${progress.current}`
}
