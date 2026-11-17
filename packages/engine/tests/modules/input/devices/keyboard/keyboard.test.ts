import { describe, expect, it, vi } from 'vitest'

import { Game, InputModule, Keyboard, KeyboardInputEvent } from '../../../../../source/index.js'

describe('Keyboard', () => {
  it('matches physical codes and supports rebinding, repeat and release', () => {
    const action = new KeyboardInputEvent({ identifier: 'jump', source: 'Space' })
    const keyboard = new Keyboard([action])
    const callback = vi.fn()
    action.connect(callback)
    keyboard.handle({ code: 'Space', repeat: true } as KeyboardEvent, true)
    action.source.value = 'KeyJ'
    keyboard.handle({ code: 'Space', repeat: false } as KeyboardEvent, false)
    keyboard.handle({ code: 'KeyJ', repeat: false } as KeyboardEvent, false)
    expect(callback.mock.calls).toEqual([
      [{ key: 'Space', down: true, repeat: true }],
      [{ key: 'KeyJ', down: false, repeat: false }],
    ])
    keyboard.destroy()
    expect(action.destroyed).toBe(true)
  })

  it('does not deliver to an action removed during dispatch', () => {
    const first = new KeyboardInputEvent({ identifier: 'first', source: 'KeyA' })
    const second = new KeyboardInputEvent({ identifier: 'second', source: 'KeyA' })
    const keyboard = new Keyboard([first, second])
    const callback = vi.fn()
    second.connect(callback)
    first.connect(() => {
      keyboard.events.delete(second)
      second.destroy()
    })
    keyboard.handle({ code: 'KeyA', repeat: false } as KeyboardEvent, true)
    expect(callback).not.toHaveBeenCalled()
    keyboard.destroy()
    expect(second.destroyed).toBe(true)
  })

  it('does not deliver unknown browser codes to unrelated actions', () => {
    const action = new KeyboardInputEvent({ identifier: 'jump', source: 'Space' })
    const keyboard = new Keyboard([action])
    const callback = vi.fn()
    action.connect(callback)
    keyboard.handle({ code: 'UnknownVendorCode', repeat: false } as KeyboardEvent, true)
    expect(callback).not.toHaveBeenCalled()
    keyboard.destroy()
  })

  it('releases pressed keys when the window loses focus', () => {
    const windowListeners = new Map<string, () => void>()
    const owner = {
      defaultView: {
        addEventListener: (type: string, listener: () => void) => {
          windowListeners.set(type, listener)
        },
        removeEventListener: (type: string) => {
          windowListeners.delete(type)
        },
      },
    }
    const target = Object.assign(new EventTarget(), {
      ownerDocument: owner,
    }) as unknown as HTMLElement
    const action = new KeyboardInputEvent({ identifier: 'forward', source: 'KeyW' })
    const keyboard = new Keyboard([action])
    const onKey = vi.fn()
    action.connect(onKey)
    const module = new InputModule({ target, devices: [keyboard] })
    const game = new (class extends Game {})([module])
    game.start()
    target.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyW', repeat: false }))
    expect(onKey).toHaveBeenLastCalledWith({ key: 'KeyW', down: true, repeat: false })

    windowListeners.get('blur')?.()

    expect(onKey).toHaveBeenLastCalledWith({ key: 'KeyW', down: false, repeat: false })
    game.stop()
    expect(windowListeners.has('blur')).toBe(false)
    game.destroy()
  })
})
