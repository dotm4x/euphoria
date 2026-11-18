import { type EventConnection } from '#/core/events/event.js'
import { type ReadOnlySignal, Signal } from '#/core/events/signal.js'
import { type ReadOnlyStore, Store } from '#/core/events/store.js'
import { type Identifiable } from '#/core/interfaces/identifiable.js'
import { Destroyable } from '#/core/primitives/destroyable.js'

import { type GamepadButtonEvent } from '../devices/gamepad/button.js'
import { type KeyboardInputEvent } from '../devices/keyboard/event.js'
import { type MouseButtonEvent } from '../devices/mouse/events/button.js'
import { type TouchEvent, TouchPhase } from '../devices/touch/touch.js'

/** Anything a named action can listen to. */
export type InputBinding =
  | { readonly kind: 'key'; readonly event: KeyboardInputEvent }
  | { readonly kind: 'mouse'; readonly event: MouseButtonEvent }
  | { readonly kind: 'gamepad'; readonly event: GamepadButtonEvent }
  | { readonly kind: 'touch'; readonly event: TouchEvent }

/** Configuration for a named action. */
export interface InputActionOptions {
  /** Unique action identifier, such as `jump`. */
  readonly identifier: string
  /** Inputs that press the action. */
  readonly bindings?: Iterable<InputBinding>
}

/**
 * A named thing the game cares about, pressed by any number of inputs.
 *
 * The action is what game code reads: `jump.pressed.value` is true while a key,
 * a mouse button, a gamepad button or a finger holds it. Rebinding is adding and
 * removing bindings, and a game can keep its own map of names to actions.
 */
export class InputAction extends Destroyable implements Identifiable<string> {
  private readonly _changed: Signal<[boolean]> = new Signal<[boolean]>()
  private readonly _pressed: Store<boolean> = new Store<boolean>(false)
  private readonly _connections: EventConnection[] = []
  private readonly _sources: Set<InputBinding> = new Set<InputBinding>()
  private readonly _held: Map<string, boolean> = new Map<string, boolean>()

  /** Unique action identifier. */
  public readonly identifier: string

  /** Whether any bound input holds the action. */
  public readonly pressed: ReadOnlyStore<boolean> = this._pressed

  /** Fired on every transition, with the new state. */
  public readonly onChanged: ReadOnlySignal<[boolean]> = this._changed

  /**
   * @param options - Identifier and the inputs that press the action.
   * @throws {@link Error} If the identifier is empty.
   */
  public constructor({ identifier, bindings = [] }: InputActionOptions) {
    super()
    if (!identifier.trim()) throw new Error('An input action identifier must not be empty.')

    this.identifier = identifier
    for (const binding of bindings) this.bind(binding)
  }

  /** Inputs bound to this action. */
  public get bindings(): ReadonlySet<InputBinding> {
    return new Set(this._sources)
  }

  /**
   * Adds an input that presses this action.
   *
   * @param binding - Input to listen to.
   */
  public bind(binding: InputBinding): void {
    this.throwIfDestroyed()
    if (this._sources.has(binding)) return
    this._sources.add(binding)
    const key = bindingIdentifier(binding)
    switch (binding.kind) {
      case 'key':
        this._connections.push(
          binding.event.connect(({ down }) => {
            this.hold(key, down)
          }),
        )
        break
      case 'mouse':
        this._connections.push(
          binding.event.connect(({ down }) => {
            this.hold(key, down)
          }),
        )
        break
      case 'gamepad':
        this._connections.push(
          binding.event.connect(({ down }) => {
            this.hold(key, down)
          }),
        )
        break
      case 'touch':
        this._connections.push(
          binding.event.connect(({ phase }) => {
            this.hold(key, phase === TouchPhase.started || phase === TouchPhase.moved)
          }),
        )
        break
    }
  }

  /** Releases every input bound to this action. */
  public clear(): void {
    for (const connection of this._connections.splice(0)) {
      if (connection.connected) connection.disconnect()
    }

    this._sources.clear()
    this._held.clear()
    if (this._pressed.value) {
      this._pressed.value = false
      this._changed.fire(false)
    }
  }

  protected override onDestroy(): void {
    this.clear()
    if (!this._pressed.destroyed) this._pressed.destroy()
    if (!this._changed.destroyed) this._changed.destroy()
  }

  private hold(key: string, down: boolean): void {
    this._held.set(key, down)
    const pressed = [...this._held.values()].some(Boolean)
    if (pressed === this._pressed.value) return
    this._pressed.value = pressed
    this._changed.fire(pressed)
  }
}

function bindingIdentifier(binding: InputBinding): string {
  switch (binding.kind) {
    case 'key':
      return `key:${binding.event.identifier}`
    case 'mouse':
      return `mouse:${binding.event.identifier}`
    case 'gamepad':
      return `gamepad:${binding.event.gamepad.toString()}:${binding.event.source.value.toString()}`
    case 'touch':
      return `touch:${binding.event.identifier}`
  }

  return 'unknown'
}
