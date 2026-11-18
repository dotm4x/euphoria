import { type InputDevice, InputModule, type InputModuleOptions } from '@euphoria/engine'

import { MyKeyboard } from './devices/keyboard.js'
import { MyMouse } from './devices/mouse.js'

/**
 * Input module of the playground.
 *
 * The devices are components of the module, so it composes them and exposes
 * them typed to the scenes that bind their actions.
 */
export class PlaygroundInputModule extends InputModule {
  private readonly _keyboard: MyKeyboard = new MyKeyboard()
  private readonly _mouse: MyMouse = new MyMouse()

  /**
   * @param options - Event target; defaults to the document body.
   */
  public constructor(options: InputModuleOptions = { target: document.body }) {
    super(options)
  }

  /** Keyboard whose actions the scenes bind. */
  public get keyboard(): MyKeyboard {
    return this._keyboard
  }

  /** Mouse whose actions the scenes bind. */
  public get mouse(): MyMouse {
    return this._mouse
  }

  protected override *compose(): Generator<InputDevice, void, unknown> {
    yield this._keyboard
    yield this._mouse
  }
}
