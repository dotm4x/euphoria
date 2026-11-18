import {
  type Camera2D,
  Color,
  type GraphicMaterial,
  type KeyboardInputEvent,
  Matrix3x2,
  MultiMeshNode,
  Node2D,
  RectNode,
  unitQuadMesh,
  type Updatable,
  type UpdateContext,
  Vector2,
} from '@euphoria/engine'

import { PlaygroundInputModule } from '../../runtime/input/module.js'

import { SnakeDirection, SnakeGame, SnakeState } from './game.js'

const cellSize = 20
const colors = {
  border: new Color(0.16, 0.2, 0.28),
  board: new Color(0.05, 0.07, 0.1),
  body: new Color(0.16, 0.62, 0.33),
  head: new Color(0.38, 0.92, 0.52),
  food: new Color(0.92, 0.3, 0.24),
}

/**
 * Scene that hosts a playable snake.
 *
 * The board, the food and every segment are canvas item nodes: the board is a
 * pair of rectangles, the food is a rectangle and the snake is a multi-mesh
 * whose instances are repositioned as the game advances.
 */
export class SnakeScene extends Node2D implements Updatable {
  public readonly camera: Camera2D
  public readonly game: SnakeGame

  private readonly _body: MultiMeshNode
  private readonly _food: RectNode

  public constructor(material: GraphicMaterial, camera: Camera2D) {
    const game = new SnakeGame()
    const width = game.columns * cellSize
    const height = game.rows * cellSize
    const border = new RectNode({
      material,
      size: new Vector2(width + 8, height + 8),
      selfModulate: colors.border,
    })
    const board = new RectNode({
      material,
      size: new Vector2(width, height),
      selfModulate: colors.board,
    })
    const food = new RectNode({
      material,
      size: new Vector2(cellSize * 0.6, cellSize * 0.6),
      selfModulate: colors.food,
    })
    const body = new MultiMeshNode({
      material,
      mesh: unitQuadMesh,
      count: game.columns * game.rows,
    })
    super({ name: 'snake', children: [border, board, food, body] })
    this.camera = camera
    this.game = game
    this._body = body
    this._food = food
    this.sync()
  }

  public update(context: UpdateContext): void {
    this.game.update(context.deltaTime)
    this.sync()
  }

  /** Values the statistics panel shows for this scene. */
  public readouts(): Iterable<readonly [string, string]> {
    return [
      ['Score', String(this.game.score)],
      ['State', this.statusText()],
    ]
  }

  protected override configure(): void {
    const keyboard = this.require(PlaygroundInputModule).keyboard
    const steer = (event: KeyboardInputEvent, direction: SnakeDirection): void => {
      event.connect(({ down, repeat }) => {
        if (!down || repeat) return
        this.game.start()
        this.game.queueDirection(direction)
      })
    }

    steer(keyboard.up, SnakeDirection.up)
    steer(keyboard.down, SnakeDirection.down)
    steer(keyboard.left, SnakeDirection.left)
    steer(keyboard.right, SnakeDirection.right)
    steer(keyboard.w, SnakeDirection.up)
    steer(keyboard.s, SnakeDirection.down)
    steer(keyboard.a, SnakeDirection.left)
    steer(keyboard.d, SnakeDirection.right)

    keyboard.space.connect(({ down, repeat }) => {
      if (!down || repeat) return
      if (this.game.state === SnakeState.over) {
        this.game.reset()
        this.game.start()
      } else if (this.game.state === SnakeState.ready) {
        this.game.start()
      } else {
        this.game.togglePause()
      }
    })

    keyboard.restart.connect(({ down, repeat }) => {
      if (!down || repeat) return
      this.game.reset()
      this.game.start()
    })
  }

  private sync(): void {
    const cells = this.game.snake
    for (let index = 0; index < cells.length; index++) {
      const cell = cells[index]
      if (cell === undefined) continue
      const size = index === 0 ? cellSize - 1 : cellSize - 3
      const x = (cell.x - this.game.columns / 2 + 0.5) * cellSize
      const y = (cell.y - this.game.rows / 2 + 0.5) * cellSize
      this._body.setTransform(
        index,
        Matrix3x2.scaling(size, size).multiply(Matrix3x2.translation(x, y)),
      )
      this._body.setColor(index, index === 0 ? colors.head : colors.body)
    }

    this._body.setActiveCount(cells.length)

    const food = this.game.food
    this._food.position.value = new Vector2(
      (food.x - this.game.columns / 2 + 0.5) * cellSize,
      (food.y - this.game.rows / 2 + 0.5) * cellSize,
    )
    this._food.visible.value = this.game.state !== SnakeState.over
  }

  private statusText(): string {
    switch (this.game.state) {
      case SnakeState.ready:
        return 'Arrows or WASD to start'
      case SnakeState.paused:
        return 'Paused — Space to resume'
      case SnakeState.over:
        return `Game over — score ${String(this.game.score)}. R to restart`
      case SnakeState.running:
        return 'Running'
    }

    return 'Running'
  }
}
