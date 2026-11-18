import { describe, expect, it } from 'vitest'

import {
  InputAction,
  KeyboardInputEvent,
  MouseButtonEvent,
  Vector2,
} from '../../../../source/index.js'

const jumpKey = (): KeyboardInputEvent =>
  new KeyboardInputEvent({ identifier: 'jump', source: 'Space' })

describe('InputAction', () => {
  it('is pressed while any bound input holds it', () => {
    const key = jumpKey()
    const action = new InputAction({ identifier: 'jump', bindings: [{ kind: 'key', event: key }] })
    const states: boolean[] = []
    action.onChanged.connect((pressed) => {
      states.push(pressed)
    })

    key.fire({ key: 'Space', down: true, repeat: false })
    expect(action.pressed.value).toBe(true)
    key.fire({ key: 'Space', down: false, repeat: false })
    expect(action.pressed.value).toBe(false)
    expect(states).toEqual([true, false])
    action.destroy()
    key.destroy()
  })

  it('stays pressed while a second binding still holds it', () => {
    const key = jumpKey()
    const button = new MouseButtonEvent({ identifier: 'jump', source: 0 })
    const action = new InputAction({
      identifier: 'jump',
      bindings: [
        { kind: 'key', event: key },
        { kind: 'mouse', event: button },
      ],
    })

    key.fire({ key: 'Space', down: true, repeat: false })
    button.fire({ button: 0, down: true, clicks: 1, position: new Vector2(0, 0) })
    key.fire({ key: 'Space', down: false, repeat: false })

    expect(action.pressed.value).toBe(true)
    action.destroy()
    key.destroy()
    button.destroy()
  })

  it('releases every binding at once', () => {
    const key = jumpKey()
    const action = new InputAction({ identifier: 'jump', bindings: [{ kind: 'key', event: key }] })
    key.fire({ key: 'Space', down: true, repeat: false })

    action.clear()

    expect(action.pressed.value).toBe(false)
    expect(action.bindings.size).toBe(0)
    action.destroy()
    key.destroy()
  })

  it('binds the same input only once', () => {
    const key = jumpKey()
    const action = new InputAction({ identifier: 'jump' })
    const binding = { kind: 'key', event: key } as const

    action.bind(binding)
    action.bind(binding)
    key.fire({ key: 'Space', down: true, repeat: false })
    key.fire({ key: 'Space', down: false, repeat: false })

    expect(action.pressed.value).toBe(false)
    expect(action.bindings.size).toBe(1)
    action.destroy()
    key.destroy()
  })

  it('rejects an empty identifier', () => {
    expect(() => new InputAction({ identifier: ' ' })).toThrow(/identifier/)
  })
})
