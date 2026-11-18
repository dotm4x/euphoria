import {
  type Camera2D,
  type GraphicMaterial,
  MeshNode,
  type MeshNodeOptions,
  Node2D,
  SpriteNode,
  type Updatable,
  type UpdateContext,
  Vector2,
  ViewportNode,
} from '@euphoria/engine'

import { createVignetteMaterial } from '../runtime/renderer/vignette.js'

import { createTriangleMesh } from './triangle.js'

/** A mesh node that spins around its origin. */
export class SpinningMeshNode extends MeshNode implements Updatable {
  private readonly _speed: number
  private _elapsed: number = 0

  public constructor({ speed = 0.6, ...options }: MeshNodeOptions & { speed?: number }) {
    super(options)
    this._speed = speed
  }

  public update(context: UpdateContext): void {
    this._elapsed += context.deltaTime
    this.rotation.value = this._elapsed * this._speed
  }
}

/** Demo scene composed of sprite, mesh and viewport nodes. */
export class MainScene extends Node2D {
  public readonly camera: Camera2D
  public readonly viewport: ViewportNode

  public constructor(material: GraphicMaterial, camera: Camera2D) {
    const viewport = new ViewportNode({
      name: 'viewport',
      size: new Vector2(640, 360),
      createMaterial: (target) => createVignetteMaterial(target),
      children: [
        new SpinningMeshNode({ material, mesh: createTriangleMesh() }),
        new SpinningMeshNode({
          material,
          mesh: createTriangleMesh(),
          position: new Vector2(-160, 0),
          scale: new Vector2(0.5, 0.5),
          speed: -0.4,
        }),
        new SpinningMeshNode({
          material,
          mesh: createTriangleMesh(),
          position: new Vector2(160, 0),
          scale: new Vector2(0.5, 0.5),
          speed: 0.9,
        }),
        new SpriteNode({
          material,
          size: new Vector2(90, 70),
          position: new Vector2(-250, -120),
          region: { min: new Vector2(0, 0), max: new Vector2(0.5, 0.5) },
        }),
        new SpriteNode({
          material,
          size: new Vector2(90, 70),
          position: new Vector2(250, -120),
          region: { min: new Vector2(0.5, 0), max: new Vector2(1, 0.5) },
        }),
        new SpriteNode({
          material,
          size: new Vector2(90, 70),
          position: new Vector2(-250, 120),
          region: { min: new Vector2(0, 0.5), max: new Vector2(0.5, 1) },
        }),
        new SpriteNode({
          material,
          size: new Vector2(90, 70),
          position: new Vector2(250, 120),
          region: { min: new Vector2(0.5, 0.5), max: new Vector2(1, 1) },
        }),
      ],
    })
    super({ name: 'main', children: [viewport] })
    this.camera = camera
    this.viewport = viewport
  }
}
