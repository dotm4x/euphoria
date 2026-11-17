import {
  Camera3D,
  ColliderDescriptor3D,
  Color,
  createBoxMesh,
  createBoxShape3D,
  createSphereMesh,
  DirectionalLight3D,
  Environment3D,
  type GraphicMaterial,
  LightEnvironment,
  MeshInstance3D,
  MotionType,
  Node,
  PhysicsBody3D,
  RevoluteJoint3D,
  Vector3,
} from '@euphoria/engine'

/** Half size of a falling cube. */
const cubeHalfExtents: Vector3 = new Vector3(0.35, 0.35, 0.35)

/** Half size of the ground. */
const groundHalfExtents: Vector3 = new Vector3(7, 0.3, 7)

/** Half size of a chain link. */
const linkHalfExtents: Vector3 = new Vector3(0.3, 0.08, 0.08)

/** How many cubes the scene drops. */
const cubeCount = 16

function tint(index: number): Color {
  const palette = [
    new Color(0.98, 0.55, 0.4),
    new Color(0.98, 0.82, 0.35),
    new Color(0.5, 0.85, 0.6),
    new Color(0.45, 0.7, 0.98),
    new Color(0.75, 0.6, 0.98),
  ]

  return palette[index % palette.length] ?? Color.white
}

/**
 * A three-dimensional physics demo.
 *
 * Cubes fall onto a static ground and a jointed chain hangs from a fixed anchor,
 * everything resolved by the simulation module and drawn by the renderer. Each
 * body owns the mesh instance that displays it, so the visual simply inherits the
 * transform the simulation resolves.
 */
export class Physics3DScene extends Node {
  private readonly _material: GraphicMaterial
  private readonly _world: Environment3D

  public readonly camera: Camera3D
  public readonly ground: PhysicsBody3D
  public readonly cubes: PhysicsBody3D[]
  public readonly links: PhysicsBody3D[]
  public readonly joints: RevoluteJoint3D[]

  public constructor(material: GraphicMaterial) {
    super({ name: 'Physics3DScene' })
    this._material = material
    this.camera = new Camera3D({
      name: 'camera',
      position: new Vector3(0, 5, 11),
      rotation: new Vector3(-0.32, 0, 0),
    })
    const world = new Environment3D({
      name: 'environment',
      environment: new LightEnvironment({ ambient: new Color(0.18, 0.19, 0.24, 1) }),
      children: [this.camera],
    })
    this._world = world
    this.add(world)

    this.ground = this.createBody(
      'ground',
      MotionType.static,
      new Vector3(0, -0.3, 0),
      groundHalfExtents,
    )
    this.ground.add(
      new MeshInstance3D({
        material,
        mesh: createBoxMesh(groundHalfExtents.scale(2)),
        modulate: new Color(0.45, 0.5, 0.58),
      }),
    )
    this._world.add(this.ground)

    this.cubes = []
    for (let index = 0; index < cubeCount; index++) {
      const column = index % 4
      const row = Math.floor(index / 4)
      const cube = this.createBody(
        `cube-${index.toString()}`,
        MotionType.dynamic,
        new Vector3(column * 0.9 - 1.35, 1.5 + row * 0.8, (row % 2) * 0.4 - 0.2),
        cubeHalfExtents,
      )
      cube.add(
        new MeshInstance3D({
          material,
          mesh: createBoxMesh(cubeHalfExtents.scale(2)),
          modulate: tint(index),
        }),
      )
      this.cubes.push(cube)
      this._world.add(cube)
    }

    this.links = []
    this.joints = []
    let previous: PhysicsBody3D = this.createBody(
      'chain-anchor',
      MotionType.static,
      new Vector3(3.2, 4.5, 0),
      new Vector3(0.1, 0.1, 0.1),
    )
    this._world.add(previous)
    for (let index = 0; index < 4; index++) {
      const link = this.createBody(
        `chain-${index.toString()}`,
        MotionType.dynamic,
        new Vector3(3.5 + index * 0.6, 4.5, 0),
        linkHalfExtents,
        1.5,
      )
      link.add(
        new MeshInstance3D({
          material,
          mesh: createBoxMesh(linkHalfExtents.scale(2)),
          modulate: new Color(0.85, 0.85, 0.95),
        }),
      )
      this.joints.push(
        new RevoluteJoint3D({
          body: previous.identifier,
          other: link.identifier,
          anchor: index === 0 ? new Vector3(0, 0, 0) : new Vector3(linkHalfExtents.x, 0, 0),
          otherAnchor: new Vector3(-linkHalfExtents.x, 0, 0),
          axis: new Vector3(0, 0, 1),
        }),
      )
      this.links.push(link)
      this._world.add(link)
      previous = link
    }

    this._world.add(new DirectionalLight3D({ name: 'sun', rotation: new Vector3(-0.9, 0.6, 0) }))
    this._world.add(
      new MeshInstance3D({
        name: 'marker',
        material,
        mesh: createSphereMesh(0.2, 8, 12),
        position: new Vector3(3.2, 4.5, 0),
        modulate: new Color(1, 1, 1, 0.9),
      }),
    )
  }

  private createBody(
    name: string,
    motion: MotionType,
    position: Vector3,
    halfExtents: Vector3,
    damping: number = 0,
  ): PhysicsBody3D {
    return new PhysicsBody3D({
      name,
      motion,
      position,
      angularDamping: damping,
      colliders: [new ColliderDescriptor3D({ shape: createBoxShape3D(halfExtents) })],
    })
  }
}
