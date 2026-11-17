import { IdentifiableSet } from '#/core/collections/identifiable-set.js'
import { type ReadOnlySignal, Signal } from '#/core/events/signal.js'
import { type ReadOnlyStore, Store } from '#/core/events/store.js'
import { Once } from '#/core/primitives/once.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { InputDevice } from '../device.js'

import { type MouseButtonEvent, type MouseButtonEventPayload } from './events/button.js'
import { type MouseMoveEventPayload } from './events/move.js'
import { type MouseWheelEventPayload } from './events/wheel.js'

/** Mouse actions and cursor state owned by an input module. */
export class Mouse extends InputDevice {
  private readonly _preparation: Once = new Once('Mouse preparation failed or is in progress.')
  private _target: HTMLElement | undefined
  private _document: Document | undefined
  private readonly mouseDown: (event: MouseEvent) => void = (event) => {
    if (this._target !== undefined) this.handleButton(event, this._target, true)
  }

  private readonly mouseUp: (event: MouseEvent) => void = (event) => {
    if (this._target !== undefined) this.handleButton(event, this._target, false)
  }

  private readonly mouseMove: (event: MouseEvent) => void = (event) => {
    if (this._target !== undefined) this.handleMove(event, this._target)
  }

  private readonly wheel: (event: WheelEvent) => void = (event) => {
    if (this._target !== undefined) this.handleWheel(event, this._target)
  }

  private readonly _position: Store<Vector2> = new Store<Vector2>(new Vector2(0, 0))
  private readonly _locked: Store<boolean> = new Store<boolean>(false)
  private readonly onPointerLockChange: () => void = () => {
    const target = this._target
    this._locked.value = target !== undefined && this._document?.pointerLockElement === target
  }

  private readonly onPointerLockError: () => void = () => {
    this._locked.value = false
  }

  private readonly _onMove: Store<MouseMoveEventPayload> = new Store<MouseMoveEventPayload>({
    position: new Vector2(0, 0),
    delta: new Vector2(0, 0),
  })

  private readonly _onWheel: Signal<MouseWheelEventPayload> = new Signal<MouseWheelEventPayload>()

  /** Adding an action transfers ownership; removing it returns ownership. */
  public readonly events: IdentifiableSet<MouseButtonEvent>
  /** Latest position relative to the element, in CSS pixels. */
  public readonly position: ReadOnlyStore<Vector2> = this._position
  /**
   * Whether the pointer is locked to the element.
   *
   * While locked, the cursor is hidden and movement is reported through
   * {@link onMove} deltas instead of the position.
   */
  public readonly locked: ReadOnlyStore<boolean> = this._locked
  /** Latest movement and change notifications. */
  public readonly onMove: ReadOnlyStore<MouseMoveEventPayload> = this._onMove
  /** Wheel notifications. */
  public readonly onWheel: ReadOnlySignal<MouseWheelEventPayload> = this._onWheel

  public constructor(events: Iterable<MouseButtonEvent> = []) {
    super('Mouse')
    this.events = new IdentifiableSet(events)
  }

  /**
   * Locks the pointer to the element.
   *
   * Browsers only allow this during a user gesture and may reject the request;
   * the rejection leaves {@link locked} as `false`. Pressing Escape releases the
   * pointer and returns control to the page.
   *
   * @throws {@link Error} If the mouse is destroyed or has not started.
   */
  public lock(): void {
    this.throwIfDestroyed()
    const target = this._target
    if (target === undefined) {
      throw new Error('The mouse must be started before locking the pointer.')
    }

    if (this._document?.pointerLockElement === target) {
      this._locked.value = true

      return
    }

    try {
      const request = target.requestPointerLock() as unknown
      if (request instanceof Promise) {
        request.catch(() => {
          this._locked.value = false
        })
      }
    } catch {
      this._locked.value = false
    }
  }

  /** Releases a pointer lock held by this element. */
  public unlock(): void {
    this.throwIfDestroyed()
    const target = this._target
    if (target === undefined) return
    const owner = this._document
    if (owner?.pointerLockElement !== target) return
    owner.exitPointerLock()
  }

  /** @internal Publishes a browser mouse button transition. */
  public handleButton(event: MouseEvent, target: HTMLElement, down: boolean): void {
    this.throwIfDestroyed()
    const position = this.positionOf(event, target)
    this._position.value = position
    for (const action of [...this.events]) {
      if (this.events.get(action.identifier) !== action) continue
      const button = action.source.value
      if (button === event.button) {
        const payload: MouseButtonEventPayload = { button, down, clicks: event.detail, position }
        action.fire(payload)
      }
    }
  }

  /** @internal Publishes browser mouse movement. */
  public handleMove(event: MouseEvent, target: HTMLElement): void {
    this.throwIfDestroyed()
    const position = this.positionOf(event, target)
    this._position.value = position
    this._onMove.value = { position, delta: new Vector2(event.movementX, event.movementY) }
  }

  /** @internal Publishes browser wheel input. */
  public handleWheel(event: WheelEvent, target: HTMLElement): void {
    this.throwIfDestroyed()
    const position = this.positionOf(event, target)
    this._position.value = position
    this._onWheel.fire({
      position,
      delta: new Vector2(event.deltaX, event.deltaY),
      deltaMode: event.deltaMode,
    })
  }

  /** Yields actions whose ownership transfers to this mouse. */
  protected *compose(): Generator<MouseButtonEvent, void, unknown> {
    // Override to yield actions.
  }

  /** Configures actions once after composition. */
  protected configure(): void {
    // Override to configure actions.
  }

  protected override onStart(target: HTMLElement): void {
    this._preparation.execute(() => {
      for (const action of this.compose()) {
        try {
          this.events.add(action)
        } catch (error) {
          if (this.events.get(action.identifier) !== action && !action.destroyed) {
            try {
              action.destroy()
            } catch (failure) {
              throw new AggregateError([error, failure], 'Mouse action cleanup failed.', {
                cause: failure,
              })
            }
          }

          throw error
        }
      }

      this.configure()
    })
    this._target = target
    target.addEventListener('mousedown', this.mouseDown)
    target.addEventListener('mouseup', this.mouseUp)
    target.addEventListener('mousemove', this.mouseMove)
    target.addEventListener('wheel', this.wheel)
    const owner = ownerOf(target)
    this._document = owner
    owner?.addEventListener('pointerlockchange', this.onPointerLockChange)
    owner?.addEventListener('pointerlockerror', this.onPointerLockError)
  }

  protected override onStop(): void {
    this._target?.removeEventListener('mousedown', this.mouseDown)
    this._target?.removeEventListener('mouseup', this.mouseUp)
    this._target?.removeEventListener('mousemove', this.mouseMove)
    this._target?.removeEventListener('wheel', this.wheel)
    const owner = this._document
    owner?.removeEventListener('pointerlockchange', this.onPointerLockChange)
    owner?.removeEventListener('pointerlockerror', this.onPointerLockError)
    if (this._target !== undefined && owner?.pointerLockElement === this._target) {
      owner.exitPointerLock()
    }

    this._locked.value = false
    this._document = undefined
    this._target = undefined
  }

  protected override onDestroy(): void {
    super.onDestroy()
    for (const action of this.events) {
      if (!action.destroyed) action.destroy()
    }

    this.events.clear()
    if (!this._position.destroyed) this._position.destroy()
    if (!this._locked.destroyed) this._locked.destroy()
    if (!this._onMove.destroyed) this._onMove.destroy()
    if (!this._onWheel.destroyed) this._onWheel.destroy()
  }

  private positionOf(event: MouseEvent, target: HTMLElement): Vector2 {
    const rect = target.getBoundingClientRect()
    return new Vector2(event.clientX - rect.left, event.clientY - rect.top)
  }
}

function ownerOf(target: HTMLElement): Document | undefined {
  return (target as { readonly ownerDocument?: Document }).ownerDocument
}
