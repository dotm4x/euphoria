import { type EventConnection } from '#/core/events/event.js'
import { type ReadOnlyStore, Store } from '#/core/events/store.js'
import { type Identifiable } from '#/core/interfaces/identifiable.js'
import { Destroyable } from '#/core/primitives/destroyable.js'

import { type GamepadAxisEvent } from '../devices/gamepad/axis.js'
import { type GamepadButtonEvent } from '../devices/gamepad/button.js'
import { type KeyboardInputEvent } from '../devices/keyboard/event.js'

/** A digital input that can drive an axis. */
export type AxisInput = KeyboardInputEvent | GamepadButtonEvent

/** Two inputs that move one axis in opposite directions. */
export interface AxisPair {
  /** Input that drives the axis towards `-1`. */
  readonly negative: AxisInput
  /** Input that drives the axis towards `1`. */
  readonly positive: AxisInput
}

/** Configuration for a named axis. */
export interface InputAxisOptions {
  /** Unique axis identifier, such as `moveX`. */
  readonly identifier: string
  /** Analog inputs that set the value directly. */
  readonly analog?: Iterable<GamepadAxisEvent>
  /** Pairs of digital inputs that push the value towards opposite ends. */
  readonly pairs?: Iterable<AxisPair>
}

/**
 * A named analog value, from `-1` to `1`.
 *
 * An axis is what movement code reads: a stick sets it directly, and a pair of
 * keys or buttons pushes it to either end, so the same code drives a character
 * with a keyboard and with a gamepad.
 */
export class InputAxis extends Destroyable implements Identifiable<string> {
  private readonly _value: Store<number> = new Store<number>(0)
  private readonly _connections: EventConnection[] = []
  private readonly _analog: Set<GamepadAxisEvent> = new Set<GamepadAxisEvent>()
  private readonly _pairs: Map<string, AxisPair> = new Map<string, AxisPair>()
  private readonly _held: Map<string, boolean> = new Map<string, boolean>()

  /** Unique axis identifier. */
  public readonly identifier: string

  /** Current value, from `-1` to `1`. */
  public readonly value: ReadOnlyStore<number> = this._value

  /**
   * @param options - Identifier, analog inputs and digital pairs.
   * @throws {@link Error} If the identifier is empty.
   */
  public constructor({ identifier, analog = [], pairs = [] }: InputAxisOptions) {
    super()
    if (!identifier.trim()) throw new Error('An input axis identifier must not be empty.')

    this.identifier = identifier
    for (const event of analog) this.bindAnalog(event)
    let index = 0
    for (const pair of pairs) {
      this.bindPair(pair, index)
      index++
    }
  }

  /**
   * Binds an analog input that sets the value directly.
   *
   * @param event - Axis of a gamepad.
   */
  public bindAnalog(event: GamepadAxisEvent): void {
    this.throwIfDestroyed()
    this._analog.add(event)
    this._connections.push(
      event.connect(() => {
        this.refresh()
      }),
    )
  }

  /**
   * Binds two digital inputs that drive the value towards either end.
   *
   * @param pair - Inputs that move the axis in opposite directions.
   * @param index - Slot of the pair, used to keep every pair apart.
   */
  public bindPair(pair: AxisPair, index: number = this._pairs.size): void {
    this.throwIfDestroyed()
    const key = `${this.identifier}:${index.toString()}`
    this._pairs.set(key, pair)
    for (const [side, event] of [
      ['negative', pair.negative],
      ['positive', pair.positive],
    ] as const) {
      this._connections.push(
        event.connect(({ down }: { readonly down: boolean }) => {
          this._held.set(`${key}:${side}`, down)
          this.refresh()
        }),
      )
    }
  }

  protected override onDestroy(): void {
    for (const connection of this._connections.splice(0)) {
      if (connection.connected) connection.disconnect()
    }

    this._analog.clear()
    this._pairs.clear()
    this._held.clear()
    if (!this._value.destroyed) this._value.destroy()
  }

  private refresh(): void {
    let value = 0
    for (const event of this._analog) value += event.value.value
    for (const key of this._pairs.keys()) {
      value += this._held.get(`${key}:positive`) === true ? 1 : 0
      value -= this._held.get(`${key}:negative`) === true ? 1 : 0
    }

    value = Math.min(1, Math.max(-1, value))
    if (value === this._value.value) return
    this._value.value = value
  }
}
