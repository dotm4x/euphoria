import { Signal } from '#/core/events/signal.js'
import { type Identifiable } from '#/core/interfaces/identifiable.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { InputDevice } from '../device.js'

/** Part of a touch gesture a touch event reports. */
export enum TouchPhase {
  /** The finger touched the surface. */
  started = 'started',
  /** The finger moved while touching. */
  moved = 'moved',
  /** The finger left the surface. */
  ended = 'ended',
  /** The browser cancelled the gesture. */
  cancelled = 'cancelled',
}

/** Payload of a touch transition. */
export interface TouchEventPayload {
  /** Identifier the browser assigned to the finger. */
  readonly pointer: number
  /** Phase of the gesture. */
  readonly phase: TouchPhase
  /** Position in CSS pixels, relative to the element. */
  readonly position: Vector2
}

/** A named touch action owned by a {@link Touch} device. */
export class TouchEvent extends Signal<TouchEventPayload> implements Identifiable<string> {
  /** Stable identifier of the action. */
  public readonly identifier: string

  /**
   * @param identifier - The nonempty action identifier.
   * @throws {@link Error} If the identifier is empty.
   */
  public constructor(identifier: string) {
    super()
    if (!identifier.trim()) throw new Error('A touch action identifier must not be empty.')

    this.identifier = identifier
  }
}

/**
 * Reads touches on the input element.
 *
 * Every finger reports the phase, its identifier and its position relative to
 * the element, which is enough for a virtual stick, a button or a drag. The
 * browser's own gestures are left untouched, so a game that needs to swallow
 * them must style the element.
 */
export class Touch extends InputDevice {
  private _target: HTMLElement | undefined
  private readonly _handlers: {
    readonly start: (event: globalThis.TouchEvent) => void
    readonly move: (event: globalThis.TouchEvent) => void
    readonly end: (event: globalThis.TouchEvent) => void
    readonly cancel: (event: globalThis.TouchEvent) => void
  }

  /** Touch actions this device reports. */
  public readonly events: Set<TouchEvent>

  /**
   * @param events - Actions reported while a finger touches the element.
   */
  public constructor(events: Iterable<TouchEvent> = []) {
    super('Touch')
    this.events = new Set(events)
    this._handlers = {
      start: (event) => {
        this.report(event, TouchPhase.started)
      },
      move: (event) => {
        this.report(event, TouchPhase.moved)
      },
      end: (event) => {
        this.report(event, TouchPhase.ended)
      },
      cancel: (event) => {
        this.report(event, TouchPhase.cancelled)
      },
    }
  }

  protected override onStart(target: HTMLElement): void {
    this._target = target
    target.addEventListener('touchstart', this._handlers.start)
    target.addEventListener('touchmove', this._handlers.move)
    target.addEventListener('touchend', this._handlers.end)
    target.addEventListener('touchcancel', this._handlers.cancel)
  }

  protected override onStop(): void {
    const target = this._target
    this._target = undefined
    if (target === undefined) return
    target.removeEventListener('touchstart', this._handlers.start)
    target.removeEventListener('touchmove', this._handlers.move)
    target.removeEventListener('touchend', this._handlers.end)
    target.removeEventListener('touchcancel', this._handlers.cancel)
  }

  protected override onDestroy(): void {
    for (const event of this.events) {
      if (!event.destroyed) event.destroy()
    }

    this.events.clear()
    super.onDestroy()
  }

  private report(event: globalThis.TouchEvent, phase: TouchPhase): void {
    const target = this._target
    if (target === undefined) return
    const bounds = target.getBoundingClientRect()
    for (const touch of [...event.changedTouches]) {
      const payload: TouchEventPayload = {
        pointer: touch.identifier,
        phase,
        position: new Vector2(touch.clientX - bounds.left, touch.clientY - bounds.top),
      }
      for (const action of this.events) action.fire(payload)
    }
  }
}
