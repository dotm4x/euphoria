import { describe, expect, it } from 'vitest'

import {
  Gamepad,
  GamepadAxisEvent,
  gamepadAxisIndex,
  GamepadButtonEvent,
  gamepadButtonIndex,
} from '../../../../../source/index.js'

type FakePad = { buttons: { pressed: boolean; value: number }[]; axes: number[] } | null

/** Reader the device polls, standing in for the browser list. */
function readerOf(pads: readonly FakePad[]) {
  return () =>
    pads.map((pad, index) =>
      pad === null ? null : { index, id: `pad-${String(index)}`, mapping: 'standard', ...pad },
    )
}

describe('Gamepad', () => {
  it('maps the standard button and axis names to their browser indexes', () => {
    expect(gamepadButtonIndex.get('a')).toBe(0)
    expect(gamepadButtonIndex.get('start')).toBe(9)
    expect(gamepadAxisIndex.get('leftX')).toBe(0)
    expect(gamepadAxisIndex.get('rightY')).toBe(3)
  })

  it('fires a button event when a button changes', () => {
    const button = GamepadButtonEvent.named('jump', 'a')
    const pad: Exclude<FakePad, null> = { buttons: [{ pressed: false, value: 0 }], axes: [] }
    const gamepad = new Gamepad({ buttons: [button], read: readerOf([pad]) })
    const seen: boolean[] = []
    button.connect(({ down }) => {
      seen.push(down)
    })
    gamepad.poll()
    pad.buttons[0] = { pressed: true, value: 1 }
    gamepad.poll()

    expect(seen).toEqual([true])
    gamepad.destroy()
  })

  it('reports an axis value and filters the dead zone', () => {
    const axis = GamepadAxisEvent.named('moveX', 'leftX')
    const pad: Exclude<FakePad, null> = { buttons: [], axes: [0.05] }
    const gamepad = new Gamepad({ axes: [axis], deadZone: 0.2, read: readerOf([pad]) })

    gamepad.poll()
    expect(axis.value.value).toBe(0)

    pad.axes[0] = -0.7
    gamepad.poll()
    expect(axis.value.value).toBe(-0.7)
    gamepad.destroy()
  })

  it('lists the connected gamepads', () => {
    const gamepad = new Gamepad({ read: readerOf([{ buttons: [], axes: [] }, null]) })

    expect(gamepad.connected).toEqual([{ index: 0, identifier: 'pad-0', standard: true }])
    gamepad.destroy()
  })

  it('rejects dead zones outside the range a stick can report', () => {
    expect(() => new Gamepad({ deadZone: 2 })).toThrow(/dead zone/)
  })
})
