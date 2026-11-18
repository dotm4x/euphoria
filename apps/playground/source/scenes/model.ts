import {
  Color,
  DirectionalLight3D,
  Environment3D,
  type GraphicMaterial,
  LightEnvironment,
  MeshInstance3D,
  type Model,
  type ModelNode,
  modelNodeRotation,
  Node3D,
  OmniLight3D,
  OrbitCamera3D,
  type Updatable,
  type UpdateContext,
  Vector3,
} from '@euphoria/engine'

/** Configuration for the model scene. */
export interface ModelSceneOptions {
  /** Model to show. */
  readonly model: Model
  /** Material used for parts whose file states none. */
  readonly material: GraphicMaterial
  /** Camera that circles the model. */
  readonly camera: OrbitCamera3D
}

/**
 * Shows a model file with the materials it was authored with.
 *
 * The model is a resource, not a scene: the scene walks its nodes and builds one
 * mesh instance per part, each with the physical material the file names. A part
 * without a material falls back to the one the story passes, so a file that only
 * carries geometry still draws.
 */
export class ModelScene extends Node3D implements Updatable {
  public readonly camera: OrbitCamera3D

  private readonly _model: Model
  private readonly _parts: Node3D[] = []
  private readonly _materials: GraphicMaterial[] = []
  private _elapsed: number = 0

  /**
   * @param options - Model, fallback material and camera.
   */
  public constructor({ model, material, camera }: ModelSceneOptions) {
    const environment = new Environment3D({
      name: 'environment',
      environment: new LightEnvironment({ ambient: new Color(0.5, 0.55, 0.65, 1) }),
    })
    super({ name: 'model', children: [environment] })

    environment.add(camera)
    environment.add(
      new DirectionalLight3D({
        name: 'sun',
        color: new Color(1, 0.96, 0.9, 1),
        energy: 1.6,
        rotation: new Vector3(-0.9, 0.6, 0),
      }),
    )
    environment.add(
      new OmniLight3D({
        name: 'fill',
        color: new Color(0.55, 0.65, 0.85, 1),
        energy: 0.8,
        range: 400,
        position: new Vector3(3, 4, 3),
      }),
    )

    const built = new Map<number, GraphicMaterial>()
    const materialOf = (index: number | undefined): GraphicMaterial => {
      if (index === undefined) return material
      const existing = built.get(index)
      if (existing !== undefined) return existing
      const described = model.materials[index]
      if (described === undefined) return material
      const created = described.createMaterial()
      built.set(index, created)
      this._materials.push(created)

      return created
    }

    const holder = new Node3D({ name: 'model' })
    const build = (node: ModelNode): Node3D => {
      const part = new Node3D({
        name: node.name === '' ? 'part' : node.name,
        position: node.translation,
        rotation: modelNodeRotation(node.rotation),
        scale: node.scale,
      })
      for (const piece of node.parts) {
        part.add(new MeshInstance3D({ material: materialOf(piece.material), mesh: piece.mesh }))
      }

      for (const child of node.children) part.add(build(child))

      return part
    }

    for (const root of model.roots) holder.add(build(root))
    environment.add(holder)

    this._model = model
    this._parts.push(holder)
    this.camera = camera
  }

  /** Name of the model being shown. */
  public get modelName(): string {
    return this._model.name === '' ? this._model.source : this._model.name
  }

  /** @inheritDoc */
  public update({ deltaTime }: UpdateContext): void {
    this._elapsed += deltaTime
    for (const part of this._parts) part.rotation.value = new Vector3(0, this._elapsed * 0.4, 0)
  }

  /** Values the statistics panel shows for this scene. */
  public readouts(): Iterable<readonly [string, string]> {
    return [
      ['Model', this.modelName],
      ['Parts', String(this._model.nodes.length)],
      ['Meshes', String(this._model.meshes.length)],
      ['Materials', String(this._model.materials.length)],
    ]
  }

  protected override onDestroy(): void {
    super.onDestroy()
    for (const material of this._materials) {
      if (!material.destroyed) material.destroy()
    }
  }
}

/**
 * Builds a camera that frames a model, whatever units it was authored in.
 *
 * A file says nothing about the units it uses: a duck may be two metres tall or
 * a hundred and sixty, so the camera reads the bounds of its geometry instead of
 * assuming a size.
 *
 * @param model - Model to frame.
 * @returns A camera around the model, or a default one when it has no geometry.
 */
export function modelCamera(model: Model): OrbitCamera3D {
  const bounds = model.bounds
  if (bounds === undefined) return new OrbitCamera3D({ name: 'camera' })

  const size = bounds.size
  const extent = Math.max(size.x, size.y, size.z)

  return new OrbitCamera3D({
    name: 'camera',
    target: bounds.center,
    distance: extent * 1.6,
    pitch: -0.2,
  })
}
