import { Node2D, type Node2DOptions } from '#/math/nodes/node2d.js'
import { Vector3 } from '#/math/primitives/vectors/vector3.js'

import { ListenerDescriptor } from '../descriptors/listener.js'
import { type Listener } from '../interfaces/playable.js'

/**
 * The ear of a two-dimensional scene.
 *
 * Added as a child of the camera, it faces wherever the node behind it faces and
 * lets the backend pan and fade placed voices against it.
 */
export class AudioListener2D extends Node2D implements Listener {
  /**
   * @param options - Node settings of the listener.
   */
  public constructor(options: Node2DOptions = {}) {
    super(options)
  }

  /** @inheritDoc */
  public describeListener(): ListenerDescriptor {
    const position = this.globalPosition
    const rotation = this.globalRotation

    return new ListenerDescriptor({
      position: new Vector3(position.x, position.y, 0),
      forward: new Vector3(Math.cos(rotation), Math.sin(rotation), 0),
      // Screen space grows downwards, so the right axis of a facing node is -Z.
      up: new Vector3(0, 0, -1),
    })
  }
}
