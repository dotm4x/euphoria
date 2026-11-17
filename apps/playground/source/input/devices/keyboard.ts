import { Keyboard, KeyboardInputEvent } from '@euphoria/engine'

export class MyKeyboard extends Keyboard {
  public up: KeyboardInputEvent = new KeyboardInputEvent({ identifier: 'up', source: 'ArrowUp' })
  public down: KeyboardInputEvent = new KeyboardInputEvent({
    identifier: 'down',
    source: 'ArrowDown',
  })

  public left: KeyboardInputEvent = new KeyboardInputEvent({
    identifier: 'left',
    source: 'ArrowLeft',
  })

  public right: KeyboardInputEvent = new KeyboardInputEvent({
    identifier: 'right',
    source: 'ArrowRight',
  })

  public w: KeyboardInputEvent = new KeyboardInputEvent({ identifier: 'w', source: 'KeyW' })
  public a: KeyboardInputEvent = new KeyboardInputEvent({ identifier: 'a', source: 'KeyA' })
  public s: KeyboardInputEvent = new KeyboardInputEvent({ identifier: 's', source: 'KeyS' })
  public d: KeyboardInputEvent = new KeyboardInputEvent({ identifier: 'd', source: 'KeyD' })
  public space: KeyboardInputEvent = new KeyboardInputEvent({
    identifier: 'space',
    source: 'Space',
  })

  public restart: KeyboardInputEvent = new KeyboardInputEvent({
    identifier: 'restart',
    source: 'KeyR',
  })

  public q: KeyboardInputEvent = new KeyboardInputEvent({ identifier: 'q', source: 'KeyQ' })
  public e: KeyboardInputEvent = new KeyboardInputEvent({ identifier: 'e', source: 'KeyE' })

  public boost: KeyboardInputEvent = new KeyboardInputEvent({
    identifier: 'boost',
    source: 'ShiftLeft',
  })

  public debug: KeyboardInputEvent = new KeyboardInputEvent({
    identifier: 'debug',
    source: 'KeyF',
  })

  protected override *compose(): Generator<KeyboardInputEvent> {
    yield this.up
    yield this.down
    yield this.left
    yield this.right
    yield this.w
    yield this.a
    yield this.s
    yield this.d
    yield this.space
    yield this.restart
    yield this.q
    yield this.e
    yield this.boost
    yield this.debug
  }
}
