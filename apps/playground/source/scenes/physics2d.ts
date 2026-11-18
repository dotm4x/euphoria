import {
  Camera2D,
  ColliderDescriptor2D,
  ColliderOutline2D,
  Color,
  createBoxShape2D,
  type GraphicMaterial,
  MotionType,
  Node,
  PhysicsBody2D,
  RectNode,
  RevoluteJoint2D,
  type SimulationSpace,
  SimulationSpace2D,
  Vector2,
} from '@euphoria/engine'

import { PlaygroundInputModule } from '../runtime/input/module.js'

/** Half size of a falling box. */
const boxHalfExtents: Vector2 = new Vector2(0.4, 0.4)

/** Half size of the floor. */
const floorHalfExtents: Vector2 = new Vector2(9, 0.4)

/** Half size of the sensor gate. */
const gateHalfExtents: Vector2 = new Vector2(7, 0.3)

/** Half size of a chain link. */
const linkHalfExtents: Vector2 = new Vector2(0.5, 0.15)

/** How many boxes the scene drops. */
const boxCount = 24

/** Impulse applied to the body under the cursor. */
const pokeImpulse = 7

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
 * A two-dimensional physics demo.
 *
 * A static floor, a sensor gate, a jointed chain and a set of falling boxes are
 * stepped by the simulation module with Rapier and drawn by the renderer, which
 * knows nothing about the simulation: bodies are ordinary nodes whose visual
 * children inherit the transform the simulation resolves.
 *
 * Clicking pokes the body under the cursor through a ray cast, the F key toggles
 * collider outlines and the gate counts the bodies that fall through it.
 */
export class PhysicsScene extends Node {
  private readonly _material: GraphicMaterial
  private readonly _outlines: ColliderOutline2D[] = []
  private _outlinesVisible: boolean = false
  private _space: SimulationSpace2D | undefined
  private _hits: number = 0

  public readonly camera: Camera2D
  public readonly floor: PhysicsBody2D
  public readonly gate: PhysicsBody2D
  public readonly boxes: PhysicsBody2D[]
  public readonly links: PhysicsBody2D[]
  public readonly joints: RevoluteJoint2D[]

  public constructor(material: GraphicMaterial) {
    super({ name: 'PhysicsScene' })
    this._material = material
    this.camera = new Camera2D({ name: 'camera', position: new Vector2(0, 1), zoom: 28 })
    this.add(this.camera)

    this.floor = this.createBody('floor', MotionType.static, new Vector2(0, 7), floorHalfExtents)
    this.floor.add(
      new RectNode({
        material,
        modulate: new Color(0.25, 0.3, 0.4),
        size: floorHalfExtents.scale(2),
      }),
    )
    this.add(this.floor)

    this.gate = this.createBody(
      'gate',
      MotionType.static,
      new Vector2(0, 1),
      gateHalfExtents,
      0,
      true,
    )
    this.gate.add(
      new RectNode({
        material,
        modulate: new Color(0.3, 0.45, 0.7, 0.35),
        size: gateHalfExtents.scale(2),
      }),
    )
    this.add(this.gate)

    this.boxes = []
    for (let index = 0; index < boxCount; index++) {
      const column = index % 6
      const row = Math.floor(index / 6)
      const box = this.createBody(
        `box-${index.toString()}`,
        MotionType.dynamic,
        new Vector2(column * 1 - 2.5 + (row % 2) * 0.5, -5 - row * 1.3),
        boxHalfExtents,
      )
      box.add(new RectNode({ material, modulate: tint(index), size: boxHalfExtents.scale(2) }))
      this.boxes.push(box)
      this.add(box)
    }

    this.links = []
    this.joints = []
    let previous: PhysicsBody2D = this.createBody(
      'chain-anchor',
      MotionType.static,
      new Vector2(-7, -4),
      new Vector2(0.1, 0.1),
    )
    this.add(previous)
    for (let index = 0; index < 3; index++) {
      const link = this.createBody(
        `chain-${index.toString()}`,
        MotionType.dynamic,
        new Vector2(-6.5 + index, -4),
        linkHalfExtents,
        1.5,
      )
      link.add(
        new RectNode({
          material,
          modulate: new Color(0.85, 0.85, 0.95),
          size: linkHalfExtents.scale(2),
        }),
      )
      this.joints.push(
        new RevoluteJoint2D({
          body: previous.identifier,
          other: link.identifier,
          anchor: index === 0 ? new Vector2(0, 0) : new Vector2(linkHalfExtents.x, 0),
          otherAnchor: new Vector2(-linkHalfExtents.x, 0),
        }),
      )
      this.links.push(link)
      this.add(link)
      previous = link
    }
  }

  /** Bodies that fell through the sensor gate. */
  public get hits(): number {
    return this._hits
  }

  /** Values the statistics panel shows for this scene. */
  public readouts(): Iterable<readonly [string, string]> {
    return [
      ['Sensor hits', String(this._hits)],
      ['Boxes', String(this.boxes.length)],
      ['Chain links', String(this.links.length)],
    ]
  }

  /**
   * Binds the space that steps this scene.
   *
   * @param space - Space that owns the bodies of the scene.
   */
  public attach(space: SimulationSpace): void {
    if (!(space instanceof SimulationSpace2D)) return
    this._space = space
    space.onContact.connect((contact) => {
      if (!this.loaded || !contact.started) return
      if (contact.identifier !== this.gate.identifier) return
      this._hits++
    })
  }

  /** @inheritDoc */
  protected override configure(): void {
    const { keyboard, mouse } = this.require(PlaygroundInputModule)
    keyboard.debug.connect(({ down }) => {
      if (!down || !this.loaded) return
      this._outlinesVisible = !this._outlinesVisible
      for (const outline of this._outlines) outline.visible.value = this._outlinesVisible
    })
    mouse.primary.connect(({ down, position }) => {
      if (!down || !this.loaded) return
      this.poke(position)
    })
  }

  private poke(position: Vector2): void {
    const space = this._space
    const canvas = globalThis.document.querySelector('#game')
    if (space === undefined || !(canvas instanceof HTMLCanvasElement)) return
    const bounds = canvas.getBoundingClientRect()
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const zoom = this.camera.zoom.value
    const camera = this.camera.position.value
    const origin = new Vector2(
      camera.x + ((position.x - bounds.left) / width - 0.5) * (width / zoom),
      camera.y + ((position.y - bounds.top) / height - 0.5) * (height / zoom),
    )
    const hit = space.castRay(origin, new Vector2(0, 1), 40)
    if (hit?.body === undefined) return
    const body = this.getByIdentifier(hit.body)
    if (!(body instanceof PhysicsBody2D)) return
    body.applyImpulse(new Vector2(0, -pokeImpulse))
  }

  private createBody(
    name: string,
    motion: MotionType,
    position: Vector2,
    halfExtents: Vector2,
    angularDamping: number = 0,
    sensor: boolean = false,
  ): PhysicsBody2D {
    const colliders = [new ColliderDescriptor2D({ shape: createBoxShape2D(halfExtents), sensor })]
    const body = new PhysicsBody2D({ name, motion, position, colliders, angularDamping })
    const outline = new ColliderOutline2D({
      material: this._material,
      colliders,
      modulate: new Color(0.35, 1, 0.55),
      width: Math.min(halfExtents.x, halfExtents.y) * 0.5,
      order: 1,
    })
    outline.visible.value = this._outlinesVisible
    this._outlines.push(outline)
    body.add(outline)

    return body
  }
}
