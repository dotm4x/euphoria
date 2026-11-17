import { type InputDevice, InputModule } from '@euphoria/engine'

import { MyKeyboard } from './devices/keyboard.js'

export class MyInputModule extends InputModule {
  public readonly keyboard: MyKeyboard = new MyKeyboard()

  protected override *compose(): Generator<InputDevice> {
    yield this.keyboard
  }
}
