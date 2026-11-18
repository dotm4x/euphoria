import {
  Camera3D,
  Color,
  createBoxMesh,
  createPlaneMesh,
  createSphereMesh,
  DirectionalLight3D,
  Environment3D,
  type GraphicMaterial,
  type KeyboardInputEvent,
  LightEnvironment,
  MeshInstance3D,
  type MeshInstance3DOptions,
  type Mouse,
  Node3D,
  OmniLight3D,
  type Updatable,
  type UpdateContext,
  Vector2,
  Vector3,
} from '@euphoria/engine'

import { PlaygroundInputModule } from '../runtime/input/module.js'

/** A mesh instance that spins around the vertical axis. */
class SpinningMesh extends MeshInstance3D implements Updatable {
  private readonly _speed: number
  private _elapsed: number = 0

  public constructor({ speed = 0.6, ...options }: MeshInstance3DOptions & { speed?: number }) {
    super(options)
    this._speed = speed
  }

  public update(context: UpdateContext): void {
    this._elapsed += context.deltaTime
    const rotation = this.rotation.value
    this.rotation.value = new Vector3(rotation.x, this._elapsed * this._speed, rotation.z)
  }
}

/**
 * A three-dimensional demo scene.
 *
 * A box, a sphere and a ground plane are lit by a directional light and an omni
 * light, all inside one environment. The camera flies free like a spectator:
 * the pointer turns it in place and WASD moves it along the view direction, so
 * there is no pivot and the horizon never tilts or flips.
 */
export class CubeScene extends Node3D implements Updatable {
  public readonly camera: Camera3D
  private readonly _sun: DirectionalLight3D
  private readonly _orbiter: OmniLight3D
  private readonly _keys: Set<string> = new Set<string>()
  private _elapsed: number = 0
  private _dragging: boolean = false
  private _yaw: number = 0
  private _pitch: number = -0.2
  private _speed: number = 5
  private _mouse: Mouse | undefined
  private _status: string = ''

  private readonly _cosa: SpinningMesh

  public constructor(material: GraphicMaterial) {
    const camera = new Camera3D({ name: 'camera', position: new Vector3(0, 2.5, 7) })
    const sun = new DirectionalLight3D({
      name: 'sun',
      rotation: new Vector3(-0.9, 0.6, 0),
    })
    const orbiter = new OmniLight3D({
      name: 'orbiter',
      color: new Color(0.4, 0.6, 1, 1),
      range: 9,
      position: new Vector3(3, 2, 3),
    })
    const cosa = new SpinningMesh({
      name: 'box',
      material,
      mesh: createBoxMesh(new Vector3(1.6, 1.6, 1.6)),
      position: new Vector3(-1.6, 1.2, 0),
      modulate: new Color(1, 0.55, 0.25, 1),
      speed: 0.7,
    })
    const environment = new Environment3D({
      name: 'environment',
      environment: new LightEnvironment({ ambient: new Color(0.16, 0.17, 0.22, 1) }),
      children: [
        sun,
        orbiter,
        cosa,
        new SpinningMesh({
          name: 'sphere',
          material,
          mesh: createSphereMesh(0.9, 14, 24),
          position: new Vector3(1.6, 1.2, 0),
          modulate: new Color(0.45, 0.7, 1, 1),
          speed: -0.5,
        }),
        new MeshInstance3D({
          name: 'ground',
          material,
          mesh: createPlaneMesh(new Vector2(12, 12)),
          position: new Vector3(0, 0, 0),
          modulate: new Color(0.5, 0.55, 0.62, 1),
        }),
      ],
    })
    super({ name: 'cube', children: [environment] })
    this.camera = camera
    this._sun = sun
    this._orbiter = orbiter
    this._cosa = cosa
    this.applyCamera()
  }

  public update(context: UpdateContext): void {
    this._elapsed += context.deltaTime
    this.moveCamera(context.deltaTime)
    this.syncStatus()
    const angle = this._elapsed * 0.5
    this._orbiter.position.value = new Vector3(Math.cos(angle) * 4, 2.5, Math.sin(angle) * 4)
    const sunRotation = this._sun.rotation.value
    this._sun.rotation.value = new Vector3(sunRotation.x, this._elapsed * 0.2, sunRotation.z)
  }

  /** Values the statistics panel shows for this scene. */
  public readouts(): Iterable<readonly [string, string]> {
    return [
      ['Camera speed', this._speed.toFixed(1)],
      ['Status', this._status],
    ]
  }

  /** @inheritDoc */
  protected override configure(): void {
    const { keyboard, mouse } = this.require(PlaygroundInputModule)
    this._mouse = mouse
    const hold = (event: KeyboardInputEvent, code: string): void => {
      event.connect(({ down }) => {
        if (down) this._keys.add(code)
        else this._keys.delete(code)
      })
    }

    hold(keyboard.w, 'forward')
    hold(keyboard.s, 'back')
    hold(keyboard.a, 'left')
    hold(keyboard.d, 'right')
    hold(keyboard.e, 'up')
    hold(keyboard.q, 'down')
    hold(keyboard.space, 'up')
    hold(keyboard.boost, 'boost')
    mouse.onMove.connect(({ value }) => {
      if (!this.loaded || (!mouse.locked.value && !this._dragging)) return
      this.look(value.delta.x, value.delta.y)
    })
    mouse.primary.connect(({ down, position }) => {
      this._dragging = down
      if (down && this.isInsideCanvas(position)) mouse.lock()
    })
    mouse.secondary.connect(({ down }) => {
      if (!down || this._cosa.destroyed) return
      this._cosa.destroy()
    })
    mouse.onWheel.connect(({ delta }) => {
      if (!this.loaded) return
      this._speed = clamp(this._speed * Math.exp(-delta.y * 0.0015), 0.5, 40)
      this.syncStatus()
    })
  }

  /** Whether a position reported by the input target falls inside the canvas. */
  private isInsideCanvas(position: Vector2): boolean {
    const canvas = document.querySelector('#game')
    if (!(canvas instanceof HTMLCanvasElement)) return false
    const rect = canvas.getBoundingClientRect()
    const input = document.body.getBoundingClientRect()

    return (
      position.x + input.left >= rect.left &&
      position.x + input.left <= rect.right &&
      position.y + input.top >= rect.top &&
      position.y + input.top <= rect.bottom
    )
  }

  /** Turns the camera in place, without moving it or orbiting a pivot. */
  private look(deltaX: number, deltaY: number): void {
    const limit = Math.PI / 2 - 0.02
    this._yaw -= deltaX * 0.0025
    this._pitch = clamp(this._pitch - deltaY * 0.0025, -limit, limit)
    this.applyCamera()
  }

  private applyCamera(): void {
    this.camera.rotation.value = new Vector3(this._pitch, this._yaw, 0)
  }

  private syncStatus(): void {
    const locked = this._mouse?.locked.value === true
    const help = `speed ${this._speed.toFixed(1)} · wheel to change`
    this._status = locked
      ? `Pointer locked · mouse to look · WASD to fly · Q/E up and down · Shift to boost · ${help}`
      : `Click to lock the pointer · drag to look · WASD to fly · Q/E up and down · ${help}`
  }

  private moveCamera(deltaTime: number): void {
    const forward = this.camera.globalBasis.forward.normalize()
    const right = this.camera.globalBasis.right.normalize()
    let direction = new Vector3(0, 0, 0)
    if (this._keys.has('forward')) direction = direction.add(forward)
    if (this._keys.has('back')) direction = direction.subtract(forward)
    if (this._keys.has('right')) direction = direction.add(right)
    if (this._keys.has('left')) direction = direction.subtract(right)
    if (this._keys.has('up')) direction = direction.add(new Vector3(0, 1, 0))
    if (this._keys.has('down')) direction = direction.subtract(new Vector3(0, 1, 0))
    if (direction.squaredMagnitude === 0) return
    const boost = this._keys.has('boost') ? 3 : 1
    const step = direction.normalize().scale(this._speed * boost * deltaTime)
    const moved = this.camera.position.value.add(step)
    this.camera.position.value = new Vector3(moved.x, Math.max(minimumAltitude, moved.y), moved.z)
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

/** Altitude below which the free camera stops, keeping the floor visible. */
const minimumAltitude = 0.6
