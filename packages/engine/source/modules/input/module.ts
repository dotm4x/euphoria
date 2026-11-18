import { Module, ModuleState } from '#/core/module.js'
import { Once } from '#/core/primitives/once.js'

import { type InputAction } from './actions/action.js'
import { type InputAxis } from './actions/axis.js'
import { type InputDevice } from './devices/device.js'
import { Gamepad } from './devices/gamepad/gamepad.js'
import { Touch } from './devices/touch/touch.js'

/** Configuration for browser input. The element is borrowed, not owned. */
export interface InputModuleOptions {
  /** Element receiving input; it must be focusable and focused for keyboard events. */
  readonly target: HTMLElement
  /** Initial devices whose ownership transfers to this module. */
  readonly devices?: Iterable<InputDevice>
  /** Actions whose ownership transfers to this module. */
  readonly actions?: Iterable<InputAction>
  /** Axes whose ownership transfers to this module. */
  readonly axes?: Iterable<InputAxis>
}

/**
 * Owns and manages browser input devices for one element.
 *
 * Events are delivered immediately while the game is running, independently
 * of the time module. The built-in keyboard requires a focused target or
 * descendant; built-in mouse events are limited to the target and its descendants.
 * Devices do not prevent browser defaults or change focus.
 */
export class InputModule extends Module {
  private readonly _devices: Map<string, InputDevice> = new Map<string, InputDevice>()
  private readonly _preparation: Once = new Once(
    'Input module preparation failed or is in progress.',
  )

  private readonly _actions: Map<string, InputAction> = new Map<string, InputAction>()
  private readonly _axes: Map<string, InputAxis> = new Map<string, InputAxis>()

  /** Borrowed input element. */
  public readonly target: HTMLElement
  public constructor({ target, devices = [], actions = [], axes = [] }: InputModuleOptions) {
    super({ identifier: 'org.js.euphoria.InputModule' })
    for (const action of actions) this._actions.set(action.identifier, action)
    for (const axis of axes) this._axes.set(axis.identifier, axis)
    const initial = [...devices]
    const identifiers = initial.map((device) => device.identifier)
    if (new Set(identifiers).size !== identifiers.length) {
      throw new Error('Duplicate input device identifier.')
    }

    if (initial.some((device) => device.destroyed || device.active)) {
      throw new Error('Input devices must be alive and inactive.')
    }

    this.target = target
    for (const device of initial) {
      this._devices.set(device.identifier, device)
    }
  }

  /** Devices indexed by stable identifier; the module retains ownership. */
  public get devices(): ReadonlyMap<string, InputDevice> {
    return new Map(this._devices)
  }

  /** Actions indexed by identifier; the module retains ownership. */
  public get actions(): ReadonlyMap<string, InputAction> {
    return new Map(this._actions)
  }

  /** Axes indexed by identifier; the module retains ownership. */
  public get axes(): ReadonlyMap<string, InputAxis> {
    return new Map(this._axes)
  }

  /** First gamepad device registered, when the game composed one. */
  public get gamepad(): Gamepad | undefined {
    const device = this._devices.get('Gamepad')

    return device instanceof Gamepad ? device : undefined
  }

  /** Touch device registered, when the game composed one. */
  public get touch(): Touch | undefined {
    const device = this._devices.get('Touch')

    return device instanceof Touch ? device : undefined
  }

  /** Keyboard device registered, when the game composed one. */
  public get keyboard(): InputDevice | undefined {
    return this._devices.get('Keyboard')
  }

  /**
   * Yields devices, actions and axes whose ownership transfers to the module.
   *
   * The options and this hook compose the same components.
   */
  protected *compose(): Generator<InputDevice | InputAction | InputAxis, void, unknown> {
    // Override to yield devices, actions and axes.
  }

  /** Configures registered devices once before startup. */
  protected configure(): void {
    // Override to configure devices.
  }

  protected override onStart(): void {
    this._preparation.execute(() => {
      for (const component of this.compose()) {
        if (!(component instanceof Object) || !('active' in component)) {
          if ('pressed' in component) this._actions.set(component.identifier, component)
          else this._axes.set(component.identifier, component)
          continue
        }

        const device = component
        try {
          if (this._devices.has(device.identifier)) {
            throw new Error(`Duplicate input device identifier '${device.identifier}'.`)
          }

          if (device.destroyed || device.active) throw new Error('Input device is not available.')
          this._devices.set(device.identifier, device)
        } catch (error) {
          if (
            this._devices.get(device.identifier) !== device &&
            !device.destroyed &&
            !device.active
          ) {
            try {
              device.destroy()
            } catch (failure) {
              throw new AggregateError([error, failure], 'Input device cleanup failed.', {
                cause: failure,
              })
            }
          }

          throw error
        }
      }

      this.configure()
    })
    for (const device of this._devices.values()) device.start(this.target)
  }

  protected override onStop(): void {
    for (const device of [...this._devices.values()].reverse()) {
      if (device.active) device.stop()
    }
  }

  protected override onDestroy(): void {
    if (!this.state.destroyed && this.state.value !== ModuleState.idle) {
      throw new Error(`Module '${this.identifier}' cannot be destroyed while not idle.`)
    }

    for (const [identifier, device] of this._devices) {
      if (!device.destroyed) device.destroy()
      this._devices.delete(identifier)
    }

    for (const action of this._actions.values()) {
      if (!action.destroyed) action.destroy()
    }

    for (const axis of this._axes.values()) {
      if (!axis.destroyed) axis.destroy()
    }

    this._actions.clear()
    this._axes.clear()
    super.onDestroy()
  }
}
