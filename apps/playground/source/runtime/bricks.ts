import { Color, Image } from '@euphoria/engine'

/** Configuration for the procedurally generated brick maps. */
export interface BrickMapsOptions {
  /** Size of one tile, in pixels; defaults to `256`. */
  readonly size?: number
  /** Bricks across one tile; defaults to `4`. */
  readonly columns?: number
  /** Rows of bricks in one tile; defaults to `8`. */
  readonly rows?: number
  /** Width of the mortar between bricks, in pixels; defaults to `6`. */
  readonly mortar?: number
  /** Random seed of the brick colors; defaults to `7`. */
  readonly seed?: number
}

/** Maps of a brick wall, ready for the physical material. */
export interface BrickMaps {
  /** Color of the bricks and the mortar. */
  readonly baseColor: Image
  /** Tangent-space normals of the recessed mortar. */
  readonly normal: Image
  /** Occlusion in red, roughness in green and metallic in blue. */
  readonly roughness: Image
  /** Every map, so the scene can release them together. */
  readonly all: readonly Image[]
}

/**
 * Draws a brick wall into three maps, without downloading a texture set.
 *
 * Every brick gets its own tint from a seeded hash, the mortar sinks between
 * them, and the normals come from the same height field the color uses, so the
 * wall reacts to a raking light the way a real one would.
 *
 * @param options - Tile size, brick grid, mortar width and seed.
 * @returns The three maps and the function that releases them.
 */
export function createBrickMaps({
  size = 256,
  columns = 4,
  rows = 8,
  mortar = 6,
  seed = 7,
}: BrickMapsOptions = {}): BrickMaps {
  const height = new Float32Array(size * size)
  const color = new Uint8Array(size * size * 4)
  const roughness = new Uint8Array(size * size * 4)
  const brickWidth = size / columns
  const brickHeight = size / rows

  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / brickHeight)
    const offset = row % 2 === 0 ? 0 : brickWidth / 2
    for (let x = 0; x < size; x++) {
      const shifted = (x + offset) % size
      const column = Math.floor(shifted / brickWidth)
      const inX = shifted - column * brickWidth
      const inY = y - row * brickHeight
      const nearEdge =
        inX < mortar || inX > brickWidth - mortar || inY < mortar || inY > brickHeight - mortar
      const index = (y * size + x) * 4
      const grain = hash(column, row, seed)
      if (nearEdge) {
        height[y * size + x] = 0
        const shade = 92 + grain * 26
        color.set([shade, shade + 2, shade + 6, 255], index)
        roughness.set([230, 235, 0, 255], index)
        continue
      }

      height[y * size + x] = 1
      const warm = 0.85 + grain * 0.3
      color.set([190 * warm, 96 * warm, 74 * warm, 255], index)
      const grainRoughness = 148 + grain * 40
      roughness.set([255, grainRoughness, 0, 255], index)
    }
  }

  const baseColor = new Image(size, size, color)
  const normal = new Image(size, size, normalsOf(height, size))
  const roughnessMap = new Image(size, size, roughness)

  return { baseColor, normal, roughness: roughnessMap, all: [baseColor, normal, roughnessMap] }
}

function normalsOf(height: Float32Array, size: number): Uint8Array {
  const data = new Uint8Array(size * size * 4)
  const strength = 3
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const left = height[y * size + ((x - 1 + size) % size)] ?? 0
      const right = height[y * size + ((x + 1) % size)] ?? 0
      const down = height[((y - 1 + size) % size) * size + x] ?? 0
      const up = height[((y + 1) % size) * size + x] ?? 0
      const nx = (left - right) * strength
      const ny = (down - up) * strength
      const length = Math.hypot(nx, ny, 1)
      const index = (y * size + x) * 4
      data.set(
        [
          (nx / length) * 127.5 + 127.5,
          (ny / length) * 127.5 + 127.5,
          (1 / length) * 127.5 + 127.5,
          255,
        ],
        index,
      )
    }
  }

  return data
}

function hash(column: number, row: number, seed: number): number {
  const value = Math.sin(column * 127.1 + row * 311.7 + seed) * 43758.5453

  return value - Math.floor(value)
}

/** Color of the light the brick scene shines from the side. */
export const rakingLight = new Color(1, 0.93, 0.82, 1)
