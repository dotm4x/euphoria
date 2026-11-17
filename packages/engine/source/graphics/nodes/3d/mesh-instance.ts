import { Store } from '#/core/events/store.js'

import { type GraphicMesh3D } from '../../geometry/mesh3d.js'

import { VisualInstance3D, type VisualInstance3DOptions } from './visual-instance.js'

/** Configuration for a mesh instance. */
export interface MeshInstance3DOptions extends VisualInstance3DOptions {
  /** Mesh drawn by the node. */
  readonly mesh: GraphicMesh3D
}

/**
 * A node that draws a three-dimensional mesh.
 *
 * The mesh is borrowed: the node applies its world transform, material, tint and
 * environment, and the backend draws it with depth testing.
 */
export class MeshInstance3D extends VisualInstance3D {
  /** Mesh drawn by the node. */
  public readonly mesh: Store<GraphicMesh3D>

  /**
   * @param options - Transformation, material, tint, order and mesh.
   */
  public constructor({ mesh, ...options }: MeshInstance3DOptions) {
    super(options)
    this.mesh = new Store(mesh)
  }

  /** @inheritDoc */
  protected override get shapeMesh(): GraphicMesh3D {
    return this.mesh.value
  }

  protected override onDestroy(): void {
    super.onDestroy()
    if (!this.mesh.destroyed) this.mesh.destroy()
  }
}
