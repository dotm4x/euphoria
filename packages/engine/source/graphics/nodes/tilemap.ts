import { Store } from '#/core/events/store.js'
import { Bounds2 } from '#/math/geometry/bounds2.js'
import { Matrix3x2 } from '#/math/primitives/matrices/matrix3x2.js'
import { Vector2 } from '#/math/primitives/vectors/vector2.js'

import { type Draw2DCommand } from '../commands/draw2d.js'
import { type DrawData } from '../data.js'
import { type GraphicMesh2D } from '../geometry/mesh2d.js'
import { type DrawContext } from '../interfaces/context.js'

import { Camera2D } from './camera2d.js'
import { CanvasItem2D, type CanvasItem2DOptions } from './canvas-item.js'
import { createRegionMesh } from './sprite/resources/sprite-region.js'

/** Layout of the atlas used by a tilemap. */
export interface TilemapTileset {
  /** Number of tile columns in the atlas. */
  readonly columns: number
  /** Number of tile rows in the atlas. */
  readonly rows: number
  /** Size of each tile in local units. */
  readonly tileSize: Vector2
}

/** Configuration for a tilemap node. */
export interface TilemapNodeOptions extends CanvasItem2DOptions {
  /** Atlas layout of the tiles. */
  readonly tileset: TilemapTileset
  /** Number of columns of the map. */
  readonly columns: number
  /** Number of rows of the map. */
  readonly rows: number
  /** Whether tiles outside the camera view are skipped. Defaults to true. */
  readonly culling?: boolean
}

/**
 * A grid of tiles sampled from an atlas.
 *
 * Only painted cells are stored, and each tile index builds its geometry once.
 * Tiles that fall outside the camera view are skipped when culling is enabled.
 */
export class TilemapNode extends CanvasItem2D {
  /** Atlas layout of the tiles. */
  public readonly tileset: Store<TilemapTileset>

  /** Whether tiles outside the camera view are skipped. */
  public readonly culling: Store<boolean>

  private readonly _columns: number
  private readonly _rows: number
  private readonly _tiles: Map<number, number> = new Map<number, number>()
  private _view: Bounds2 | undefined
  private readonly _meshes: Map<number, GraphicMesh2D> = new Map<number, GraphicMesh2D>()

  /**
   * @param options - Tileset, map size, culling and canvas item options.
   * @throws {@link RangeError} If the map or the atlas has no tiles.
   */
  public constructor({ tileset, columns, rows, culling = true, ...options }: TilemapNodeOptions) {
    super(options)
    if (!Number.isInteger(columns) || columns < 1 || !Number.isInteger(rows) || rows < 1) {
      throw new RangeError('A tilemap requires positive integer dimensions.')
    }

    if (
      !Number.isInteger(tileset.columns) ||
      tileset.columns < 1 ||
      !Number.isInteger(tileset.rows) ||
      tileset.rows < 1
    ) {
      throw new RangeError('A tileset requires positive integer dimensions.')
    }

    this.tileset = new Store(tileset)
    this.culling = new Store(culling)
    this._columns = columns
    this._rows = rows
  }

  /** Number of columns of the map. */
  public get columns(): number {
    return this._columns
  }

  /** Number of rows of the map. */
  public get rows(): number {
    return this._rows
  }

  /** Number of painted cells. */
  public get tileCount(): number {
    return this._tiles.size
  }

  /**
   * Paints a cell with a tile of the atlas.
   *
   * @param column - Map column.
   * @param row - Map row.
   * @param tile - Index of the tile in the atlas.
   * @throws {@link RangeError} If the cell or the tile is outside the map.
   */
  public setTile(column: number, row: number, tile: number): void {
    const tileset = this.tileset.value
    if (tile < 0 || tile >= tileset.columns * tileset.rows) {
      throw new RangeError('Tile indices must exist in the tileset.')
    }

    this._tiles.set(this.index(column, row), tile)
  }

  /**
   * Returns the tile painted in a cell.
   *
   * @param column - Map column.
   * @param row - Map row.
   * @returns The tile index, or undefined when the cell is empty.
   */
  public tileAt(column: number, row: number): number | undefined {
    return this._tiles.get(this.index(column, row))
  }

  /**
   * Clears a cell.
   *
   * @param column - Map column.
   * @param row - Map row.
   * @returns Whether the cell had a tile.
   */
  public clearTile(column: number, row: number): boolean {
    return this._tiles.delete(this.index(column, row))
  }

  /** @inheritDoc */
  public override draw(context: DrawContext): DrawData {
    this._view = this.viewBounds(context)
    try {
      return super.draw(context)
    } finally {
      this._view = undefined
    }
  }

  /** @inheritDoc */
  protected override collectDraw(commands: Draw2DCommand[]): void {
    const tileset = this.tileset.value
    const tileSize = tileset.tileSize
    const view = this._view
    for (const [cell, tile] of this._tiles) {
      const column = cell % this._columns
      const row = Math.floor(cell / this._columns)
      const x = (column - this._columns / 2 + 0.5) * tileSize.x
      const y = (row - this._rows / 2 + 0.5) * tileSize.y
      if (view !== undefined) {
        const center = this.globalTransform.transform(new Vector2(x, y))
        const half = new Vector2(tileSize.x / 2, tileSize.y / 2)
        if (!view.intersects(new Bounds2(center.subtract(half), center.add(half)))) continue
      }

      commands.push(
        this.createCommand(
          this.meshFor(tile),
          Matrix3x2.scaling(tileSize.x, tileSize.y).multiply(Matrix3x2.translation(x, y)),
        ),
      )
    }
  }

  protected override onDestroy(): void {
    for (const mesh of this._meshes.values()) {
      if (!mesh.destroyed) mesh.destroy()
    }

    this._meshes.clear()
    this._tiles.clear()
    if (!this.tileset.destroyed) this.tileset.destroy()
    if (!this.culling.destroyed) this.culling.destroy()
    super.onDestroy()
  }

  private index(column: number, row: number): number {
    if (column < 0 || row < 0 || column >= this._columns || row >= this._rows) {
      throw new RangeError('Tile cells must be inside the map.')
    }

    return row * this._columns + column
  }

  private meshFor(tile: number): GraphicMesh2D {
    const cached = this._meshes.get(tile)
    if (cached !== undefined) return cached
    const tileset = this.tileset.value
    const column = tile % tileset.columns
    const row = Math.floor(tile / tileset.columns)
    const width = 1 / tileset.columns
    const height = 1 / tileset.rows
    const mesh = createRegionMesh({
      min: new Vector2(column * width, row * height),
      max: new Vector2((column + 1) * width, (row + 1) * height),
    })
    this._meshes.set(tile, mesh)

    return mesh
  }

  private viewBounds(context: DrawContext): Bounds2 | undefined {
    if (!this.culling.value || !(context.camera instanceof Camera2D)) return undefined
    const camera = context.camera
    const width = context.viewport.size.x / camera.zoom.value
    const height = context.viewport.size.y / camera.zoom.value
    const center = camera.globalPosition
    const half = new Vector2(width / 2, height / 2)

    return new Bounds2(center.subtract(half), center.add(half))
  }
}
