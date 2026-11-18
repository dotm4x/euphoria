import { type RenderBackend, WebGlBackend } from '@euphoria/engine'

/** What the render benchmark publishes on the window. */
export interface RenderBenchmark {
  readonly mode: string
  readonly count: number
  readonly nodes: number
  readonly frames: number
  readonly elapsed: number
  readonly fps: number
  readonly drawCalls: number
  readonly commands: number
}

declare global {
  interface Window {
    ballsRenderBenchmark?: RenderBenchmark
  }
}

const warmupFrames = 20

/**
 * Measures how long the renderer takes to draw the current scene.
 *
 * Reading pixels forces the GPU to finish the queued frames, so the measurement
 * covers the whole pipeline instead of the commands alone.
 *
 * @param backend - Backend that draws the scene.
 * @param render - Draws one frame.
 * @param options - Frames to measure, scene mode, ball count and node count.
 * @returns Whether a benchmark was requested and executed.
 */
export function measureRender(
  backend: RenderBackend,
  render: () => void,
  options: {
    readonly frames?: number
    readonly mode?: string
    readonly count?: number
    readonly nodes?: number
  },
): boolean {
  const params = new URLSearchParams(globalThis.location.search)
  if (params.get('bench') !== 'render' || !(backend instanceof WebGlBackend)) return false
  const requested = Number(params.get('frames') ?? options.frames ?? 240)
  const frames = Number.isFinite(requested) ? Math.max(1, Math.floor(requested)) : 240
  for (let index = 0; index < warmupFrames; index++) render()
  backend.readPixels()
  const started = performance.now()
  for (let index = 0; index < frames; index++) render()
  backend.readPixels()
  const elapsed = (performance.now() - started) / 1000
  window.ballsRenderBenchmark = {
    mode: options.mode ?? 'single',
    count: options.count ?? 0,
    nodes: options.nodes ?? 0,
    frames,
    elapsed,
    fps: frames / Math.max(elapsed, 0.000001),
    drawCalls: backend.stats.drawCalls,
    commands: backend.stats.commands,
  }
  document.body.dataset.bench = 'done'

  return true
}
