import { Store } from '#/core/events/store.js'
import { type ReadOnlyStore } from '#/core/events/store.js'
import { Vector3 } from '#/math/primitives/vectors/vector3.js'
import { type InputAction } from '#/modules/input/actions/action.js'
import { type InputAxis } from '#/modules/input/actions/axis.js'
import { type MouseMoveEventPayload } from '#/modules/input/devices/mouse/events/move.js'
import { type UpdateContext } from '#/modules/time/context.js'
import { type Updatable } from '#/modules/time/interfaces/updatable.js'

import { Camera3D, type Camera3DOptions } from '../camera.js'

/** Configuration for a free-flying camera. */
export interface FlyCamera3DOptions extends Camera3DOptions {
  /** Axis that moves the camera forward and back. */
  readonly forwardAxis?: InputAxis
  /** Axis that moves the camera right and left. */
  readonly rightAxis?: InputAxis
  /** Axis that moves the camera up and down. */
  readonly upAxis?: InputAxis
  /** Action that doubles the speed while it is held. */
  readonly boost?: InputAction
  /** Action that slows the camera while it is held. */
  readonly slow?: InputAction
  /** Pointer movements that turn the camera while dragging. */
  readonly pointerMove?: ReadOnlyStore<MouseMoveEventPayload>
  /** Action that turns the camera while it is pressed. */
  readonly drag?: InputAction
  /** Units per second at full speed; defaults to `6`. */
  readonly speed?: number
  /** Radians turned per pixel dragged; defaults to `0.004`. */
  readonly sensitivity?: number
}

/**
 * A camera that flies where the player points.
 *
 * Axes move it along its own view, so a stick and a pair of keys drive the same
 * code, and dragging the pointer turns it in place without tilting the horizon.
 * It is positioned in {@link update}, never in its constructor.
 */
export class FlyCamera3D extends Camera3D implements Updatable {
  private readonly _connections: { disconnect(): void }[] = []
  private readonly _forwardAxis: InputAxis | undefined
  private readonly _rightAxis: InputAxis | undefined
  private readonly _upAxis: InputAxis | undefined
  private readonly _boost: InputAction | undefined
  private readonly _slow: InputAction | undefined
  private readonly _drag: InputAction | undefined
  private _yaw: number = 0
  private _pitch: number = 0

  /** Units per second at full speed. */
  public readonly speed: Store<number>

  /** Radians turned per pixel dragged. */
  public readonly sensitivity: number

  /**
   * @param options - Projection, speed, sensitivity and the inputs that drive it.
   */
  public constructor({
    forwardAxis,
    rightAxis,
    upAxis,
    boost,
    slow,
    pointerMove,
    drag,
    speed = 6,
    sensitivity = 0.004,
    rotation,
    ...options
  }: FlyCamera3DOptions = {}) {
    super({ ...options, ...(rotation === undefined ? {} : { rotation }) })
    this.speed = new Store(speed)
    this.sensitivity = sensitivity
    this._forwardAxis = forwardAxis
    this._rightAxis = rightAxis
    this._upAxis = upAxis
    this._boost = boost
    this._slow = slow
    this._drag = drag
    const initial = rotation ?? this.rotation.value
    this._yaw = initial.y
    this._pitch = initial.x

    if (pointerMove !== undefined) {
      this._connections.push(
        pointerMove.connect(({ value }) => {
          if (this._drag !== undefined && !this._drag.pressed.value) return
          this.turn(value.delta.x, value.delta.y)
        }),
      )
    }
  }

  /**
   * Turns the camera by a pointer delta, in pixels.
   *
   * The pitch is limited so the horizon never flips, and the roll stays zero.
   *
   * @param deltaX - Horizontal movement; positive turns right.
   * @param deltaY - Vertical movement; positive looks down.
   */
  public turn(deltaX: number, deltaY: number): void {
    this._yaw -= deltaX * this.sensitivity
    this._pitch = Math.min(1.5, Math.max(-1.5, this._pitch - deltaY * this.sensitivity))
    this.rotation.value = new Vector3(this._pitch, this._yaw, 0)
  }

  /** @inheritDoc */
  public update({ deltaTime }: UpdateContext): void {
    const forward = this._forwardAxis?.value.value ?? 0
    const right = this._rightAxis?.value.value ?? 0
    const up = this._upAxis?.value.value ?? 0
    if (forward === 0 && right === 0 && up === 0) return

    const boost = this._boost?.pressed.value === true ? 3 : 1
    const slow = this._slow?.pressed.value === true ? 0.3 : 1
    const step = this.speed.value * boost * slow * deltaTime
    const basis = this.globalBasis
    const movement = basis.forward
      .scale(forward * step)
      .add(basis.right.scale(right * step))
      .add(new Vector3(0, up * step, 0))
    this.position.value = this.position.value.add(movement)
  }

  protected override onDestroy(): void {
    for (const connection of this._connections.splice(0)) connection.disconnect()
    if (!this.speed.destroyed) this.speed.destroy()
    super.onDestroy()
  }
}
