/** Metrics a story reports while it runs. */
export interface RuntimeStats {
  /** Frames rendered since the runtime started. */
  readonly frames: number
  /** Simulated time of the latest update, in seconds. */
  readonly deltaTime: number
  /** Draw calls issued by the latest frame. */
  readonly drawCalls: number
  /** Draw commands processed by the latest frame. */
  readonly commands: number
  /** Rendered frames per second over the latest window. */
  readonly fps: number
  /** Values the scene contributes, such as a score or a sensor count. */
  readonly readouts: readonly (readonly [label: string, value: string])[]
}

const engineRows: readonly (readonly [label: string, key: keyof RuntimeStats])[] = [
  ['Frames', 'frames'],
  ['Delta', 'deltaTime'],
  ['Draw calls', 'drawCalls'],
  ['Commands', 'commands'],
  ['FPS', 'fps'],
]

const styles = {
  root: [
    'display:flex',
    'flex-direction:column',
    'gap:0.35rem',
    'align-items:flex-start',
    'align-self:flex-start',
    'font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
    'color:#c6cbd6',
    'background:#151922',
    'border:1px solid #262c38',
    'border-radius:6px',
    'padding:0.5rem 0.75rem',
  ].join(';'),
  row: 'display:flex;gap:0.75rem;min-width:14rem',
  label: 'flex:1;color:#7e8798',
  value: 'color:#e6e8ee',
  button: [
    'font:inherit',
    'padding:0.15rem 0.6rem',
    'border:1px solid #3a4150',
    'border-radius:4px',
    'background:#1a1e27',
    'color:#e6e8ee',
    'cursor:pointer',
  ].join(';'),
}

/**
 * Shows the engine metrics of a running story next to its canvas.
 *
 * The panel owns no state beyond its DOM: the runtime feeds it the latest
 * statistics, and the scene readouts are rebuilt only when the labels change.
 */
export class StatsPanel {
  private readonly _root: HTMLDivElement
  private readonly _values: Map<string, HTMLElement> = new Map<string, HTMLElement>()
  private readonly _readouts: HTMLDivElement
  private readonly _button: HTMLButtonElement
  private _readoutLabels: readonly string[] = []
  private _onToggle: (() => boolean) | undefined
  private _paused: boolean = false

  private readonly handleClick: () => void = () => {
    const running = this._onToggle?.()
    if (running === undefined) return
    this._paused = !running
    this._button.textContent = this._paused ? 'Resume' : 'Pause'
  }

  /**
   * @param container - Element the panel is appended to.
   */
  public constructor(container: HTMLElement) {
    this._root = document.createElement('div')
    this._root.style.cssText = styles.root
    const metrics = document.createElement('div')
    for (const [label] of engineRows) {
      metrics.append(this.createRow(label))
    }

    this._readouts = document.createElement('div')
    this._button = document.createElement('button')
    this._button.type = 'button'
    this._button.textContent = 'Pause'
    this._button.style.cssText = styles.button
    this._button.addEventListener('click', this.handleClick)
    this._root.append(metrics, this._readouts, this._button)
    container.append(this._root)
  }

  /** Handles pause and resume requests, returning whether the story is running. */
  public set onToggle(handler: (() => boolean) | undefined) {
    this._onToggle = handler
  }

  /**
   * Renders the latest statistics.
   *
   * @param stats - Metrics and scene readouts.
   */
  public update(stats: RuntimeStats): void {
    for (const [label, key] of engineRows) {
      this._values.get(label)?.replaceChildren(textOf(format(key, stats[key])))
    }

    const labels = stats.readouts.map(([label]) => label)
    if (
      labels.length !== this._readoutLabels.length ||
      labels.some((label, index) => label !== this._readoutLabels[index])
    ) {
      this._readoutLabels = labels
      this._readouts.replaceChildren(...labels.map((label) => this.createRow(label)))
    }

    for (const [label, value] of stats.readouts) {
      this._values.get(label)?.replaceChildren(textOf(value))
    }
  }

  /** Removes the panel from the document. */
  public dispose(): void {
    this._button.removeEventListener('click', this.handleClick)
    this._root.remove()
  }

  private createRow(label: string): HTMLElement {
    const row = document.createElement('div')
    row.style.cssText = styles.row
    const name = document.createElement('span')
    name.textContent = label
    name.style.cssText = styles.label
    const value = document.createElement('span')
    value.style.cssText = styles.value
    row.append(name, value)
    this._values.set(label, value)

    return row
  }
}

function format(key: keyof RuntimeStats, value: RuntimeStats[keyof RuntimeStats]): string {
  if (key === 'deltaTime') return `${(value as number).toFixed(3)} s`
  if (key === 'fps') return (value as number).toFixed(1)

  return String(value)
}

function textOf(value: string): Text {
  return document.createTextNode(value)
}
