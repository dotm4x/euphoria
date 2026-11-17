import { type InputDevice, InputModule } from '@euphoria/engine'

import { MyKeyboard } from './devices/keyboard.js'
import { MyMouse } from './devices/mouse.js'

export class MyInputModule extends InputModule {
  public readonly keyboard: MyKeyboard = new MyKeyboard()
  public readonly mouse: MyMouse = new MyMouse()

  protected override *compose(): Generator<InputDevice> {
    yield this.keyboard
    yield this.mouse
  }
}
