import { InputEvent } from '../event.js'

/** A standard gamepad button, following the browser mapping. */
export type GamepadButtonName =
  | 'a'
  | 'b'
  | 'x'
  | 'y'
  | 'leftBumper'
  | 'rightBumper'
  | 'leftTrigger'
  | 'rightTrigger'
  | 'select'
  | 'start'
  | 'leftStick'
  | 'rightStick'
  | 'dpadUp'
  | 'dpadDown'
  | 'dpadLeft'
  | 'dpadRight'
  | 'home'

/** Index of every standard button in the browser gamepad mapping. */
export const gamepadButtonIndex: ReadonlyMap<GamepadButtonName, number> = new Map([
  ['a', 0],
  ['b', 1],
  ['x', 2],
  ['y', 3],
  ['leftBumper', 4],
  ['rightBumper', 5],
  ['leftTrigger', 6],
  ['rightTrigger', 7],
  ['select', 8],
  ['start', 9],
  ['leftStick', 10],
  ['rightStick', 11],
  ['dpadUp', 12],
  ['dpadDown', 13],
  ['dpadLeft', 14],
  ['dpadRight', 15],
  ['home', 16],
])

/** Payload of a gamepad button transition. */
export interface GamepadButtonEventPayload {
  /** Index of the button that changed. */
  readonly button: number
  /** Whether the button is now held. */
  readonly down: boolean
  /** How far the button is pressed, from `0` to `1`. */
  readonly value: number
}

/** A named action bound to one button of a gamepad. */
export class GamepadButtonEvent extends InputEvent<GamepadButtonEventPayload, number> {
  /** Index of the gamepad the button belongs to. */
  public readonly gamepad: number

  /**
   * @param options - Action identifier, button index and gamepad to read.
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
  }

  /**
   * @param options - Action identifier, button index and gamepad to read.
   * @throws {@link Error} If a standard name is given without a gamepad index.
   */
  public static named(
    identifier: string,
    name: GamepadButtonName,
    gamepad: number = 0,
  ): GamepadButtonEvent {
    const button = gamepadButtonIndex.get(name)
    if (button === undefined) throw new Error(`Unknown gamepad button '${name}'.`)

    return new GamepadButtonEvent({ identifier, source: button, gamepad })
  }
}
