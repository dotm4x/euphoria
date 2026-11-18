import { Node3D, type Node3DOptions } from '#/math/nodes/node3d.js'
import { Vector3 } from '#/math/primitives/vectors/vector3.js'

import { ListenerDescriptor } from '../descriptors/listener.js'
import { type Listener } from '../interfaces/playable.js'

/**
 * The ear of a three-dimensional scene.
 *
 * Added as a child of the camera, it inherits its position and facing, so what
 * the camera sees is what the player hears around.
 */
export class AudioListener3D extends Node3D implements Listener {
  /**
   * @param options - Node settings of the listener.
   */
  public constructor(options: Node3DOptions = {}) {
    super(options)
  }

  /** @inheritDoc */
  public describeListener(): ListenerDescriptor {
    const basis = this.globalBasis

    return new ListenerDescriptor({
      position: this.globalPosition,
      forward: new Vector3(basis.forward.x, basis.forward.y, basis.forward.z),
      up: new Vector3(basis.up.x, basis.up.y, basis.up.z),
    })
  }
}
