import { Store } from '#/core/events/store.js'

import { InputEvent } from '../event.js'

/** A standard analog axis, following the browser gamepad mapping. */
export type GamepadAxisName = 'leftX' | 'leftY' | 'rightX' | 'rightY'

/** Index of every standard axis in the browser gamepad mapping. */
export const gamepadAxisIndex: ReadonlyMap<GamepadAxisName, number> = new Map([
  ['leftX', 0],
  ['leftY', 1],
  ['rightX', 2],
  ['rightY', 3],
])

/** Payload of an analog axis change. */
export interface GamepadAxisEventPayload {
  /** Value of the axis, from `-1` to `1`. */
  readonly value: number
}

/** A named analog axis of one gamepad. */
export class GamepadAxisEvent extends InputEvent<GamepadAxisEventPayload, number> {
  /** Index of the gamepad the axis belongs to. */
  public readonly gamepad: number

  /** Latest value of the axis, from `-1` to `1`. */
  public readonly value: Store<number>

  /**
   * @param options - Action identifier, axis index and gamepad to read.
   */
  public constructor({
    identifier,
    source,
    gamepad = 0,
  }: {
    readonly identifier: string
    readonly source: number
    readonly gamepad?: number
  }) {
    super({ identifier, source })
    this.gamepad = gamepad
    this.value = new Store(0)
  }

  /**
   * @param options - Action identifier, axis index and gamepad to read.
   */
  public static named(
    identifier: string,
    name: GamepadAxisName,
    gamepad: number = 0,
  ): GamepadAxisEvent {
    const axis = gamepadAxisIndex.get(name)
    if (axis === undefined) throw new Error(`Unknown gamepad axis '${name}'.`)

    return new GamepadAxisEvent({ identifier, source: axis, gamepad })
  }

  protected override onDestroy(): void {
    if (!this.value.destroyed) this.value.destroy()
    super.onDestroy()
  }
}
