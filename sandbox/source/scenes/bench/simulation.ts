import { Vector2 } from '@dotm4x/euphoria'

/** Arena in which the benchmark balls bounce. */
export interface Arena {
  readonly width: number
  readonly height: number
}

/** A ball bouncing inside an arena. */
export class Ball {
  public position: Vector2
  public velocity: Vector2
  public readonly radius: number
  public readonly palette: number

  public constructor(position: Vector2, velocity: Vector2, radius: number, palette: number) {
    this.position = position
    this.velocity = velocity
    this.radius = radius
    this.palette = palette
  }

  /**
   * Advances the ball and reflects it on the arena walls.
   *
   * @param deltaTime - Elapsed seconds.
   * @param arena - Arena that bounds the ball.
   */
  public update(deltaTime: number, arena: Arena): void {
    let x = this.position.x + this.velocity.x * deltaTime
    let y = this.position.y + this.velocity.y * deltaTime
    let vx = this.velocity.x
    let vy = this.velocity.y
    if (x < this.radius) {
      x = this.radius
      vx = Math.abs(vx)
    } else if (x > arena.width - this.radius) {
      x = arena.width - this.radius
      vx = -Math.abs(vx)
    }

    if (y < this.radius) {
      y = this.radius
      vy = Math.abs(vy)
    } else if (y > arena.height - this.radius) {
      y = arena.height - this.radius
      vy = -Math.abs(vy)
    }

    this.position = new Vector2(x, y)
    this.velocity = new Vector2(vx, vy)
  }
}

/**
 * Creates the balls of the benchmark.
 *
 * @param count - Number of balls.
 * @param arena - Arena that bounds the balls.
 * @param random - Source of randomness in the range [0, 1).
 * @returns The balls, spread across the arena.
 */
export function createBalls(count: number, arena: Arena, random = Math.random): Ball[] {
  const balls: Ball[] = []
  for (let index = 0; index < count; index++) {
    const radius = 3 + random() * 5
    balls.push(
      new Ball(
        new Vector2(
          radius + random() * (arena.width - radius * 2),
          radius + random() * (arena.height - radius * 2),
        ),
        new Vector2((random() - 0.5) * 240, (random() - 0.5) * 240),
        radius,
        index % 6,
      ),
    )
  }

  return balls
}
