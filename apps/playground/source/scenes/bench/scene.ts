import {
  type Camera2D,
  CanvasItem2D,
  Color,
  type Draw2DCommand,
  type GraphicMaterial,
  type GraphicMesh2D,
  Matrix3x2,
  Node2D,
  RectNode,
  unitQuadMesh,
  type Updatable,
  type UpdateContext,
  Vector2,
} from '@euphoria/engine'

import { type Ball, createBalls } from './simulation.js'

export type BallsMode = 'single' | 'nodes'

const arena = { width: 620, height: 340 }
const left = -arena.width / 2
const top = -arena.height / 2
const palette: readonly Color[] = [
  new Color(0.95, 0.3, 0.3),
  new Color(0.95, 0.65, 0.25),
  new Color(0.9, 0.9, 0.3),
  new Color(0.35, 0.85, 0.45),
  new Color(0.3, 0.65, 0.95),
  new Color(0.7, 0.4, 0.95),
]

/** One node that updates and draws every ball. */
export class BallsNode extends CanvasItem2D implements Updatable {
  private readonly _balls: Ball[]
  private readonly _shape: GraphicMesh2D = unitQuadMesh

  public constructor(material: GraphicMaterial, count: number) {
    super({ material })
    this._balls = createBalls(count, arena)
  }

  public update(context: UpdateContext): void {
    for (const ball of this._balls) ball.update(context.deltaTime, arena)
  }

  protected override collectDraw(commands: Draw2DCommand[]): void {
    for (const ball of this._balls) {
      const color = palette[ball.palette] ?? Color.white
      const transform = Matrix3x2.scaling(ball.radius * 2, ball.radius * 2).multiply(
        Matrix3x2.translation(left + ball.position.x, top + ball.position.y),
      )
      commands.push(this.createCommand(this._shape, transform, { tint: color }))
    }
  }
}

/** One node per ball, each with its own state. */
export class BallNode extends RectNode implements Updatable {
  private readonly _ball: Ball

  public constructor(material: GraphicMaterial, ball: Ball) {
    super({
      material,
      size: new Vector2(ball.radius * 2, ball.radius * 2),
      selfModulate: palette[ball.palette] ?? Color.white,
      position: new Vector2(left + ball.position.x, top + ball.position.y),
    })
    this._ball = ball
  }

  public update(context: UpdateContext): void {
    this._ball.update(context.deltaTime, arena)
    this.position.value = new Vector2(left + this._ball.position.x, top + this._ball.position.y)
  }
}

/** Scene that renders a configurable number of bouncing balls. */
export class BallsScene extends Node2D {
  public readonly camera: Camera2D
  public readonly mode: BallsMode
  public readonly count: number

  public constructor(material: GraphicMaterial, camera: Camera2D, mode: BallsMode, count: number) {
    const children: Node2D[] = []
    if (mode === 'single') {
      children.push(new BallsNode(material, count))
    } else {
      for (const ball of createBalls(count, arena)) children.push(new BallNode(material, ball))
    }

    super({ name: 'balls', children })
    this.camera = camera
    this.mode = mode
    this.count = count
  }

  /** Values the statistics panel shows for this scene. */
  public readouts(): Iterable<readonly [string, string]> {
    return [
      ['Mode', this.mode],
      ['Balls', String(this.count)],
      ['Nodes', String(this.mode === 'single' ? 1 : this.count)],
    ]
  }
}
