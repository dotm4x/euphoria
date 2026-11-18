import {
  Camera3D,
  Color,
  createPlaneMesh,
  DirectionalLight3D,
  Environment3D,
  LightEnvironment,
  MeshInstance3D,
  Node3D,
  PbrMaterial,
  type RenderBackend,
  type Updatable,
  type UpdateContext,
  Vector2,
  Vector3,
} from '@euphoria/engine'

import { createBrickMaps } from '../runtime/bricks.js'

/** Configuration for the brick scene. */
export interface PbrSceneOptions {
  /** Backend the story passes, kept for the story signature. */
  readonly backend: RenderBackend
}

/**
 * A brick wall lit from the side by a physical material.
 *
 * The wall is a plane with the maps the generator draws: color, normals from the
 * same height field and a roughness channel. The light rakes across it from the
 * left, so the recessed mortar casts the normals into relief, and the camera
 * turns slowly to show the highlight sliding along the bricks.
 */
export class PbrScene extends Node3D implements Updatable {
  public readonly camera: Camera3D

  private readonly _wall: MeshInstance3D
  private readonly _sun: DirectionalLight3D
  private _elapsed: number = 0
  private readonly _maps: ReturnType<typeof createBrickMaps>
  private readonly _material: PbrMaterial

  /**
   * @param options - Backend that owns the material.
   */
  public constructor({ backend: _backend }: PbrSceneOptions) {
    const maps = createBrickMaps()
    const material = new PbrMaterial({
      name: 'brick',
      baseColorMap: maps.baseColor,
      normalMap: maps.normal,
      metallicRoughnessMap: maps.roughness,
      metallic: 0.05,
      roughness: 1,
      normalScale: 1.4,
    })
    const camera = new Camera3D({
      name: 'camera',
      position: new Vector3(0, 1.6, 4.4),
      rotation: new Vector3(-0.42, 0, 0),
    })
    const sun = new DirectionalLight3D({
      name: 'raking',
      color: new Color(1, 0.93, 0.82, 1),
      energy: 2.2,
      rotation: new Vector3(-0.25, 1.15, 0),
    })
    const wall = new MeshInstance3D({
      name: 'wall',
      material: material.createMaterial(),
      mesh: createPlaneMesh(new Vector2(6, 6)),
      position: new Vector3(0, 0, 0),
    })

    super({
      name: 'pbr',
      children: [
        new Environment3D({
          name: 'environment',
          environment: new LightEnvironment({ ambient: new Color(0.16, 0.17, 0.22, 1) }),
          children: [camera, sun, wall],
        }),
      ],
    })

    this.camera = camera
    this._wall = wall
    this._sun = sun
    this._maps = maps
    this._material = material
  }

  /** @inheritDoc */
  public update({ deltaTime }: UpdateContext): void {
    this._elapsed += deltaTime
    this._sun.rotation.value = new Vector3(-0.25, 1.15 + Math.sin(this._elapsed * 0.5) * 0.5, 0)
    this.camera.position.value = new Vector3(Math.sin(this._elapsed * 0.2) * 1.2, 1.4, 6)
    this.camera.rotation.value = new Vector3(-0.12, -Math.sin(this._elapsed * 0.2) * 0.1, 0)
  }

  /** Values the statistics panel shows for this scene. */
  public readouts(): Iterable<readonly [string, string]> {
    return [
      ['Material', this._material.name],
      ['Maps', 'color · normal · roughness'],
      ['Light', 'directional, raking'],
    ]
  }

  protected override onDestroy(): void {
    super.onDestroy()
    const material = this._wall.material.value
    if (material !== undefined && !material.destroyed) material.destroy()
    for (const image of this._maps.all) {
      if (!image.destroyed) image.destroy()
    }
  }
}
