import { Store } from '#/core/events/store.js'
import { type Node3D } from '#/math/nodes/node3d.js'
import { Vector3 } from '#/math/primitives/vectors/vector3.js'
import { type UpdateContext } from '#/modules/time/context.js'
import { type Updatable } from '#/modules/time/interfaces/updatable.js'

import { Camera3D, type Camera3DOptions } from '../camera.js'

/** Configuration for a camera that follows a node. */
export interface FollowCamera3DOptions extends Camera3DOptions {
  /** Node the camera follows. */
  readonly target: Node3D
  /** Offset from the target, in world units; defaults to behind and above. */
  readonly offset?: Vector3
  /** Seconds the camera takes to catch up; zero follows exactly. Defaults to `0.15`. */
  readonly smoothing?: number
}

/**
 * A camera that trails a node without snapping to it.
 *
 * The smoothing is a plain exponential decay on the elapsed time, so it behaves
 * the same at any frame rate. A camera with no smoothing copies the target on
 * every update.
 */
export class FollowCamera3D extends Camera3D implements Updatable {
  /** Node the camera follows. */
  public readonly target: Node3D

  /** Offset applied to the target position. */
  public readonly offset: Store<Vector3>

  /** Seconds the camera takes to catch up. */
  public readonly smoothing: Store<number>

  /**
   * @param options - Projection, the node to follow, the offset and the smoothing.
   */
  public constructor({
    target,
    offset = new Vector3(0, 4, 8),
    smoothing = 0.15,
    ...options
  }: FollowCamera3DOptions) {
    super(options)
    this.target = target
    this.offset = new Store(offset)
    this.smoothing = new Store(smoothing)
    this.place(target.globalPosition.add(offset))
  }

  /** @inheritDoc */
  public update({ deltaTime }: UpdateContext): void {
    const wanted = this.target.globalPosition.add(this.offset.value)
    const smoothing = this.smoothing.value
    if (smoothing <= 0) {
      this.place(wanted)
      return
    }

    const blend = 1 - Math.exp(-deltaTime / smoothing)
    const current = this.globalPosition
    this.place(
      new Vector3(
        current.x + (wanted.x - current.x) * blend,
        current.y + (wanted.y - current.y) * blend,
        current.z + (wanted.z - current.z) * blend,
      ),
    )
  }

  protected override onDestroy(): void {
    if (!this.offset.destroyed) this.offset.destroy()
    if (!this.smoothing.destroyed) this.smoothing.destroy()
    super.onDestroy()
  }

  private place(position: Vector3): void {
    this.position.value = position
    const target = this.target.globalPosition
    const direction = new Vector3(
      target.x - position.x,
      target.y - position.y,
      target.z - position.z,
    )
    this.rotation.value = new Vector3(
      -Math.asin(Math.min(1, Math.max(-1, direction.normalize().y))),
      Math.atan2(target.x - position.x, target.z - position.z),
      0,
    )
  }
}
