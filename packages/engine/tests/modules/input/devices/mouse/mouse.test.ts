import { describe, expect, it, vi } from 'vitest'

import { Game, InputModule, Mouse, MouseButtonEvent, Vector2 } from '../../../../../source/index.js'

describe('Mouse', () => {
  it('updates position for an unsupported button without firing an action', () => {
    const target = { getBoundingClientRect: () => ({ left: 10, top: 20 }) } as HTMLElement
    const action = new MouseButtonEvent({ identifier: 'select', source: 0 })
    const mouse = new Mouse([action])
    const callback = vi.fn()
    action.connect(callback)
    mouse.handleButton(
      { button: 7, detail: 1, clientX: 15, clientY: 28 } as MouseEvent,
      target,
      true,
    )
    expect(callback).not.toHaveBeenCalled()
    expect(mouse.position.value).toEqual(new Vector2(5, 8))
    mouse.destroy()
  })

  it('publishes button, motion and wheel with element-relative positions', () => {
    const target = { getBoundingClientRect: () => ({ left: 10, top: 20 }) } as HTMLElement
    const button = new MouseButtonEvent({ identifier: 'select', source: 0 })
    const mouse = new Mouse([button])
    const onButton = vi.fn()
    const onMove = vi.fn()
    const onWheel = vi.fn()
    button.connect(onButton)
    mouse.onMove.connect(onMove)
    mouse.onWheel.connect(onWheel)
    mouse.handleButton(
      { button: 0, detail: 2, clientX: 15, clientY: 28 } as MouseEvent,
      target,
      true,
    )
    expect(onButton).toHaveBeenCalledWith({
      button: 0,
      clicks: 2,
      down: true,
      position: new Vector2(5, 8),
    })
    mouse.handleMove({ clientX: 18, clientY: 30, movementX: 3, movementY: 2 } as MouseEvent, target)
    expect(onMove).toHaveBeenCalledOnce()
    expect(mouse.onMove.value).toEqual({
      position: new Vector2(8, 10),
      delta: new Vector2(3, 2),
    })
    mouse.handleWheel(
      { clientX: 20, clientY: 32, deltaX: 1, deltaY: -2, deltaMode: 1 } as WheelEvent,
      target,
    )
    expect(onWheel).toHaveBeenCalledWith({
      position: new Vector2(10, 12),
      delta: new Vector2(1, -2),
      deltaMode: 1,
    })
    expect(mouse.position.value).toEqual(new Vector2(10, 12))
    mouse.destroy()
    expect(button.destroyed).toBe(true)
    expect(mouse.position.destroyed).toBe(true)
    expect(mouse.onWheel.destroyed).toBe(true)
  })

  it('locks and unlocks the pointer through the owner document', () => {
    const listeners = new Map<string, () => void>()
    const exitPointerLock = vi.fn()
    const owner = {
      pointerLockElement: null as Element | null,
      exitPointerLock,
      addEventListener: (type: string, listener: () => void) => {
        listeners.set(type, listener)
      },
      removeEventListener: (type: string) => {
        listeners.delete(type)
      },
    } as unknown as Document
    const requestPointerLock = vi.fn()
    const target = Object.assign(new EventTarget(), {
      ownerDocument: owner,
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      requestPointerLock,
    }) as unknown as HTMLElement
    const mouse = new Mouse()
    const module = new InputModule({ target, devices: [mouse] })
    const game = new (class extends Game {})([module])
    game.start()

    expect(mouse.locked.value).toBe(false)
    mouse.lock()
    expect(requestPointerLock).toHaveBeenCalledOnce()

    Object.assign(owner, { pointerLockElement: target })
    listeners.get('pointerlockchange')?.()
    expect(mouse.locked.value).toBe(true)

    mouse.unlock()
    expect(exitPointerLock).toHaveBeenCalledOnce()

    Object.assign(owner, { pointerLockElement: null })
    listeners.get('pointerlockchange')?.()
    expect(mouse.locked.value).toBe(false)
    game.stop()
    game.destroy()
  })

  it('requires a started mouse to lock the pointer', () => {
    const mouse = new Mouse()

    expect(() => {
      mouse.lock()
    }).toThrow('must be started')
    mouse.destroy()
  })

  it('releases the pointer lock when the device stops', () => {
    const exitPointerLock = vi.fn()
    const owner = {
      pointerLockElement: null as Element | null,
      exitPointerLock,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document
    const requestPointerLock = vi.fn()
    const target = Object.assign(new EventTarget(), {
      ownerDocument: owner,
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      requestPointerLock,
    }) as unknown as HTMLElement
    ;(owner as { pointerLockElement: Element | null }).pointerLockElement = target
    const mouse = new Mouse()
    const module = new InputModule({ target, devices: [mouse] })
    const game = new (class extends Game {})([module])
    game.start()

    game.stop()

    expect(exitPointerLock).toHaveBeenCalledOnce()
    expect(mouse.locked.value).toBe(false)
    game.destroy()
  })
})
