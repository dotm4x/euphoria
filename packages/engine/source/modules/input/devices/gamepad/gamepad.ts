import { IdentifiableSet } from '#/core/collections/identifiable-set.js'

import { InputDevice } from '../device.js'

import { type GamepadAxisEvent } from './axis.js'
import { type GamepadButtonEvent } from './button.js'

/** A connected gamepad, as the browser reports it. */
export interface ConnectedGamepad {
  /** Index of the gamepad in the browser list. */
  readonly index: number
  /** Identifier the browser assigned to the device. */
  readonly identifier: string
  /** Whether the device reports a standard layout. */
  readonly standard: boolean
}

/** Configuration for a gamepad device. */
export interface GamepadOptions {
  /** Identifier of the device; defaults to `Gamepad`. */
  readonly identifier?: string
  /** Buttons polled while the device is attached. */
  readonly buttons?: Iterable<GamepadButtonEvent>
  /** Axes polled while the device is attached. */
  readonly axes?: Iterable<GamepadAxisEvent>
  /** Value below which an axis is reported as zero; defaults to `0.15`. */
  readonly deadZone?: number
  /**
   * Reads the connected gamepads; defaults to the browser list.
   *
   * Passing one lets a test drive the device with pads of its own.
   */
  readonly read?: () => readonly (BrowserGamepad | null)[]
}

/** The part of a browser gamepad this device reads. */
export interface BrowserGamepad {
  /** Index of the gamepad in the list. */
  readonly index: number
  /** Identifier the browser assigned to the device. */
  readonly id: string
  /** Mapping the browser reports; `standard` follows the usual layout. */
  readonly mapping: string
  /** Buttons of the pad, in mapping order. */
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[]
  /** Axes of the pad, in mapping order. */
  readonly axes: readonly number[]
}

/**
 * Reads gamepads by polling, which is the only way browsers expose them.
 *
 * The device polls on animation frames while it runs and fires a button event on
 * every change, so a game reacts the same way it does to a key. Connected
 * gamepads are reported through {@link onConnected} when the browser announces
 * them.
 */
export class Gamepad extends InputDevice {
  private _frame: number | undefined
  private readonly _states: Map<number, boolean[]> = new Map<number, boolean[]>()

  /** Buttons this device reports. */
  public readonly buttons: IdentifiableSet<GamepadButtonEvent>

  /** Axes this device reports. */
  public readonly axes: IdentifiableSet<GamepadAxisEvent>

  /** Value below which an axis is reported as zero. */
  public readonly deadZone: number

  private readonly _read: () => readonly (BrowserGamepad | null)[]

  /**
   * @param options - Identifier, buttons, axes and dead zone.
   * @throws {@link RangeError} If the dead zone is not between zero and one.
   */
  public constructor({
    identifier = 'Gamepad',
    buttons = [],
    axes = [],
    deadZone = 0.15,
    read = browserPads,
  }: GamepadOptions = {}) {
    super(identifier)
    if (!Number.isFinite(deadZone) || deadZone < 0 || deadZone > 1) {
      throw new RangeError('The gamepad dead zone must be between zero and one.')
    }

    this.buttons = new IdentifiableSet(buttons)
    this.axes = new IdentifiableSet(axes)
    this.deadZone = deadZone
    this._read = read
  }

  /** Gamepads the browser reports right now. */
  public get connected(): readonly ConnectedGamepad[] {
    const pads = this._read()

    return [...pads].flatMap((pad) =>
      pad === null
        ? []
        : [
            {
              index: pad.index,
              identifier: pad.id,
              standard: pad.mapping === 'standard',
            },
          ],
    )
  }

  /**
   * Polls every gamepad once.
   *
   * Gamepads do not emit events, so the device calls this on animation frames.
   * Calling it by hand lets a test drive the device without a browser.
   */
  public poll(): void {
    this.throwIfDestroyed()
    const pads = this._read()
    for (const [index, pad] of pads.entries()) {
      if (pad === null) continue
      this.pollButtons(index, pad)
      this.pollAxes(index, pad)
    }
  }

  protected override onStart(): void {
    if (typeof requestAnimationFrame !== 'function') return
    const tick = (): void => {
      if (!this.active) return
      this.poll()
      this._frame = requestAnimationFrame(tick)
    }

    this._frame = requestAnimationFrame(tick)
  }

  protected override onStop(): void {
    if (this._frame !== undefined && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._frame)
    }

    this._frame = undefined
    this._states.clear()
  }

  protected override onDestroy(): void {
    for (const button of [...this.buttons]) {
      if (!button.destroyed) button.destroy()
    }

    for (const axis of [...this.axes]) {
      if (!axis.destroyed) axis.destroy()
    }

    this.buttons.clear()
    this.axes.clear()
    super.onDestroy()
  }

  private pollButtons(index: number, pad: BrowserGamepad): void {
    let previous = this._states.get(index)
    if (previous === undefined) {
      previous = pad.buttons.map(() => false)
      this._states.set(index, previous)
    }

    for (const [buttonIndex, button] of pad.buttons.entries()) {
      const down = button.pressed
      const was = previous[buttonIndex] ?? false
      previous[buttonIndex] = down
      if (down === was) continue
      for (const event of this.buttons) {
        if (event.gamepad !== index || event.source.value !== buttonIndex) continue
        event.fire({ button: buttonIndex, down, value: button.value })
      }
    }
  }

  private pollAxes(index: number, pad: { readonly axes: readonly number[] }): void {
    for (const [axisIndex, value] of pad.axes.entries()) {
      const filtered = Math.abs(value) < this.deadZone ? 0 : value
      for (const event of this.axes) {
        if (event.gamepad !== index || event.source.value !== axisIndex) continue
        if (event.value.value === filtered) continue
        event.value.value = filtered
        event.fire({ value: filtered })
      }
    }
  }
}

/**
 * Reads the gamepads the browser reports.
 *
 * @returns The connected gamepads, with holes for the disconnected ones.
 */
function browserPads(): readonly (BrowserGamepad | null)[] {
  const pads = globalThis.navigator.getGamepads()

  return [...pads] as readonly (BrowserGamepad | null)[]
}
