import { describe, expect, it } from 'vitest'

import {
  GamepadAxisEvent,
  InputAxis,
  KeyboardInputEvent,
  type KeyboardKey,
} from '../../../../source/index.js'

const key = (identifier: string, source: KeyboardKey): KeyboardInputEvent =>
  new KeyboardInputEvent({ identifier, source })

describe('InputAxis', () => {
  it('moves towards either end with a pair of keys', () => {
    const left = key('left', 'ArrowLeft')
    const right = key('right', 'ArrowRight')
    const axis = new InputAxis({
      identifier: 'moveX',
      pairs: [{ negative: left, positive: right }],
    })

    right.fire({ key: 'ArrowRight', down: true, repeat: false })
    expect(axis.value.value).toBe(1)

    right.fire({ key: 'ArrowRight', down: false, repeat: false })
    left.fire({ key: 'ArrowLeft', down: true, repeat: false })
    expect(axis.value.value).toBe(-1)

    left.fire({ key: 'ArrowLeft', down: false, repeat: false })
    expect(axis.value.value).toBe(0)
    axis.destroy()
    left.destroy()
    right.destroy()
  })

  it('cancels both directions when they are held together', () => {
    const left = key('left', 'KeyA')
    const right = key('right', 'KeyD')
    const axis = new InputAxis({
      identifier: 'moveX',
      pairs: [{ negative: left, positive: right }],
    })

    left.fire({ key: 'KeyA', down: true, repeat: false })
    right.fire({ key: 'KeyD', down: true, repeat: false })

    expect(axis.value.value).toBe(0)
    axis.destroy()
    left.destroy()
    right.destroy()
  })

  it('reads a gamepad stick directly', () => {
    const stick = GamepadAxisEvent.named('moveX', 'leftX')
    const axis = new InputAxis({ identifier: 'moveX', analog: [stick] })

    stick.value.value = 0.4
    stick.fire({ value: 0.4 })

    expect(axis.value.value).toBe(0.4)
    axis.destroy()
    stick.destroy()
  })

  it('clamps the value to the range the game reads', () => {
    const stick = GamepadAxisEvent.named('moveX', 'leftX')
    const axis = new InputAxis({ identifier: 'moveX', analog: [stick] })

    stick.value.value = 4
    stick.fire({ value: 4 })

    expect(axis.value.value).toBe(1)
    axis.destroy()
    stick.destroy()
  })
})
