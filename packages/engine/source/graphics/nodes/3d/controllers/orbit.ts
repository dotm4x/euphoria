import { type ReadOnlySignal } from '#/core/events/signal.js'
import { Store } from '#/core/events/store.js'
import { type ReadOnlyStore } from '#/core/events/store.js'
import { Vector3 } from '#/math/primitives/vectors/vector3.js'
import { type InputAxis } from '#/modules/input/actions/axis.js'
import { type MouseButtonEvent } from '#/modules/input/devices/mouse/events/button.js'
import { type MouseMoveEventPayload } from '#/modules/input/devices/mouse/events/move.js'
import { type MouseWheelEventPayload } from '#/modules/input/devices/mouse/events/wheel.js'
import { type UpdateContext } from '#/modules/time/context.js'
import { type Updatable } from '#/modules/time/interfaces/updatable.js'

import { Camera3D, type Camera3DOptions } from '../camera.js'

/** Configuration for a camera that orbits a target. */
export interface OrbitCamera3DOptions extends Camera3DOptions {
  /** Point the camera looks at; defaults to the origin. */
  readonly target?: Vector3
  /** Distance to the target in world units; defaults to `10`. */
  readonly distance?: number
  /** Horizontal angle in radians; defaults to `0`. */
  readonly yaw?: number
  /** Vertical angle in radians, from `-pi/2` to `pi/2`; defaults to `-0.3`. */
  readonly pitch?: number
  /** Radians turned per pixel dragged; defaults to `0.005`. */
  readonly sensitivity?: number
  /** World units added to the distance per wheel unit; defaults to `0.01`. */
  readonly zoomSpeed?: number
  /** Nearest distance the wheel reaches, in world units; defaults to `1`. */
  readonly minimumDistance?: number
  /** Farthest distance the wheel reaches, in world units; defaults to `120`. */
  readonly maximumDistance?: number
  /** Mouse button that drags the camera; defaults to the primary one. */
  readonly dragButton?: MouseButtonEvent
  /** Pointer movement that turns the camera while dragging. */
  readonly pointerMove?: ReadOnlyStore<MouseMoveEventPayload>
  /** Wheel that zooms the camera. */
  readonly wheel?: ReadOnlySignal<MouseWheelEventPayload>
  /** Axis that turns the camera horizontally, for a stick or a key pair. */
  readonly yawAxis?: InputAxis
  /** Axis that turns the camera vertically, for a stick or a key pair. */
  readonly pitchAxis?: InputAxis
  /** Axis that zooms the camera, for a stick or a key pair. */
  readonly zoomAxis?: InputAxis
}

/**
 * A camera that circles a point it always looks at.
 *
 * Dragging turns it, the wheel moves it closer or further, and axes do both when
 * the game binds a stick or a pair of keys. The camera is positioned in
 * {@link update}, so it never fights anything else writing the transform.
 */
export class OrbitCamera3D extends Camera3D implements Updatable {
  private readonly _connections: { disconnect(): void }[] = []
  private _dragging: boolean = false

  /** Point the camera looks at. */
  public readonly target: Store<Vector3>

  /** Distance to the target, in world units. */
  public readonly distance: Store<number>

  /** Horizontal angle, in radians. */
  public readonly yaw: Store<number>

  /** Vertical angle, in radians. */
  public readonly pitch: Store<number>

  /** Radians turned per pixel dragged. */
  public readonly sensitivity: number

  /** World units added to the distance per wheel unit. */
  public readonly zoomSpeed: number

  /** Nearest distance the wheel reaches. */
  public readonly minimumDistance: number

  /** Farthest distance the wheel reaches. */
  public readonly maximumDistance: number

  private readonly _pitchAxis: InputAxis | undefined
  private readonly _zoomAxis: InputAxis | undefined
  private readonly _yawAxis: InputAxis | undefined

  /**
   * @param options - Projection, target, angles, distance and the inputs that drive it.
   */
  public constructor({
    target = new Vector3(0, 0, 0),
    distance = 10,
    yaw = 0,
    pitch = -0.3,
    sensitivity = 0.005,
    zoomSpeed = 0.01,
    minimumDistance = 1,
    maximumDistance = 120,
    dragButton,
    pointerMove,
    wheel,
    yawAxis,
    pitchAxis,
    zoomAxis,
    ...options
  }: OrbitCamera3DOptions = {}) {
    super(options)
    this.target = new Store(target)
    this.distance = new Store(distance)
    this.yaw = new Store(yaw)
    this.pitch = new Store(pitch)
    this.sensitivity = sensitivity
    this.zoomSpeed = zoomSpeed
    this.minimumDistance = minimumDistance
    this.maximumDistance = maximumDistance
    this._yawAxis = yawAxis
    this._pitchAxis = pitchAxis
    this._zoomAxis = zoomAxis

    if (dragButton !== undefined) {
      this._connections.push(
        dragButton.connect(({ down }) => {
          this._dragging = down
        }),
      )
    }

    if (pointerMove !== undefined) {
      this._connections.push(
        pointerMove.connect(({ value }) => {
          if (this._dragging) this.turn(value.delta.x, value.delta.y)
        }),
      )
    }

    if (wheel !== undefined) {
      this._connections.push(
        wheel.connect(({ delta }) => {
          this.zoom(delta.y * this.zoomSpeed)
        }),
      )
    }

    this.apply()
  }

  /**
   * Turns the camera by a pointer delta, in pixels.
   *
   * @param deltaX - Horizontal movement; positive turns right.
   * @param deltaY - Vertical movement; positive turns down.
   */
  public turn(deltaX: number, deltaY: number): void {
    this.yaw.value -= deltaX * this.sensitivity
    this.pitch.value = clamp(this.pitch.value - deltaY * this.sensitivity, -1.5, 1.5)
  }

  /**
   * Moves the camera closer or further.
   *
   * @param amount - World units to add to the distance.
   */
  public zoom(amount: number): void {
    this.distance.value = clamp(
      this.distance.value + amount,
      this.minimumDistance,
      this.maximumDistance,
    )
  }

  /** @inheritDoc */
  public update({ deltaTime }: UpdateContext): void {
    const turn = (this._yawAxis?.value.value ?? 0) * deltaTime * 2
    const tilt = (this._pitchAxis?.value.value ?? 0) * deltaTime * 2
    const zoom = (this._zoomAxis?.value.value ?? 0) * deltaTime * 8
    if (turn !== 0) this.yaw.value -= turn
    if (tilt !== 0) this.pitch.value = clamp(this.pitch.value - tilt, -1.5, 1.5)
    if (zoom !== 0) this.zoom(-zoom)
    this.apply()
  }

  protected override onDestroy(): void {
    for (const connection of this._connections.splice(0)) connection.disconnect()
    for (const store of [this.target, this.distance, this.yaw, this.pitch]) {
      if (!store.destroyed) store.destroy()
    }

    super.onDestroy()
  }

  private apply(): void {
    const distance = this.distance.value
    const yaw = this.yaw.value
    const pitch = this.pitch.value
    const target = this.target.value
    const position = new Vector3(
      target.x + Math.cos(pitch) * Math.sin(yaw) * distance,
      target.y + Math.sin(pitch) * distance,
      target.z + Math.cos(pitch) * Math.cos(yaw) * distance,
    )
    this.position.value = position
    this.rotation.value = new Vector3(-pitch, yaw, 0)
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}
