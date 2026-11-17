import { Store } from '#/core/events/store.js'

import { type GraphicMesh2D } from '../../../geometry/mesh2d.js'
import { CanvasItem2D, type CanvasItem2DOptions } from '../canvas-item.js'

/** Configuration for a mesh node. */
export interface MeshNodeOptions extends CanvasItem2DOptions {
  /** Mesh drawn by the node. */
  readonly mesh: GraphicMesh2D
}

/**
 * A node that draws a mesh with the material and tint of its canvas ancestors.
 *
 * The mesh is borrowed: the node does not destroy it.
 */
export class MeshNode extends CanvasItem2D {
  /** Mesh drawn by the node. */
  public readonly mesh: Store<GraphicMesh2D>

  /**
   * @param options - Transformation, material, tint and mesh.
   */
  public constructor({ mesh, ...options }: MeshNodeOptions) {
    super(options)
    this.mesh = new Store(mesh)
  }

  /** @inheritDoc */
  protected override get shapeMesh(): GraphicMesh2D {
    return this.mesh.value
  }

  protected override onDestroy(): void {
    super.onDestroy()
    if (!this.mesh.destroyed) this.mesh.destroy()
  }
}
