import { Vector2 } from '#/math/primitives/vectors/vector2.js'
import { Vector3 } from '#/math/primitives/vectors/vector3.js'

import { GraphicMesh2D } from '../geometry/mesh2d.js'
import { GraphicMesh3D } from '../geometry/mesh3d.js'
import { GraphicVertex2D } from '../geometry/vertex2d.js'
import { Vertex3D } from '../geometry/vertex3d.js'
import { type Font } from '../resources/font.js'

import { type TextGlyphQuad, type TextLayout } from './layout.js'

const forward = new Vector3(0, 0, 1)

/**
 * Turns a laid out text into geometry.
 *
 * Every glyph becomes one quad, so the whole text is a single mesh the renderer
 * can batch. The color of each run travels in the vertices, which keeps text
 * sharing one material while two runs on the same line have different colors.
 *
 * @param layout - Text placed in world units.
 * @param quads - Glyphs to build, or every glyph of the layout.
 * @returns A mesh with one quad per glyph, in the coordinate system of the layout.
 */
export function createTextMesh2D(
  layout: TextLayout,
  quads: readonly TextGlyphQuad[] = layout.quads,
): GraphicMesh2D {
  const vertices: GraphicVertex2D[] = []
  const indices: number[] = []
  for (const quad of quads) {
    const first = vertices.length
    vertices.push(...quadVertices2D(quad))
    indices.push(first, first + 1, first + 2, first, first + 2, first + 3)
  }

  return new GraphicMesh2D(vertices, indices)
}

/**
 * Turns a laid out text into three-dimensional geometry.
 *
 * The text faces positive Z and grows upwards, which is the orientation of a
 * mesh instance that has not been rotated. The three-dimensional vertex has no
 * color, so runs share the material there.
 *
 * @param layout - Text placed in world units.
 * @param depth - Depth offset applied to every glyph; defaults to zero.
 * @param quads - Glyphs to build, or every glyph of the layout.
 * @returns A mesh with one quad per glyph.
 */
export function createTextMesh3D(
  layout: TextLayout,
  depth: number = 0,
  quads: readonly TextGlyphQuad[] = layout.quads,
): GraphicMesh3D {
  const vertices: Vertex3D[] = []
  const indices: number[] = []
  for (const quad of quads) {
    const first = vertices.length
    vertices.push(...quadVertices3D(quad, depth))
    indices.push(first, first + 1, first + 2, first, first + 2, first + 3)
  }

  return new GraphicMesh3D(vertices, indices)
}

function quadVertices2D(quad: TextGlyphQuad): readonly GraphicVertex2D[] {
  const color = quad.color
  return [
    new GraphicVertex2D(new Vector2(quad.x, quad.y), new Vector2(quad.u0, quad.v0), color),
    new GraphicVertex2D(
      new Vector2(quad.x + quad.width, quad.y),
      new Vector2(quad.u1, quad.v0),
      color,
    ),
    new GraphicVertex2D(
      new Vector2(quad.x + quad.width, quad.y + quad.height),
      new Vector2(quad.u1, quad.v1),
      color,
    ),
    new GraphicVertex2D(
      new Vector2(quad.x, quad.y + quad.height),
      new Vector2(quad.u0, quad.v1),
      color,
    ),
  ]
}

function quadVertices3D(quad: TextGlyphQuad, depth: number): readonly Vertex3D[] {
  const left = quad.x
  const right = quad.x + quad.width
  const top = -quad.y
  const bottom = -(quad.y + quad.height)

  return [
    new Vertex3D(new Vector3(left, top, depth), forward, new Vector2(quad.u0, quad.v0)),
    new Vertex3D(new Vector3(right, top, depth), forward, new Vector2(quad.u1, quad.v0)),
    new Vertex3D(new Vector3(right, bottom, depth), forward, new Vector2(quad.u1, quad.v1)),
    new Vertex3D(new Vector3(left, bottom, depth), forward, new Vector2(quad.u0, quad.v1)),
  ]
}

/**
 * Groups the glyphs of a layout by the font they draw with.
 *
 * A node draws one mesh per group, because glyphs from two fonts sample two
 * atlases and a material binds only one.
 *
 * @param layout - Text placed in world units.
 * @returns The glyphs of every font, in the order the fonts first appear.
 */
export function groupQuadsByFont(
  layout: TextLayout,
): readonly (readonly [Font, readonly TextGlyphQuad[]])[] {
  const groups = new Map<Font, TextGlyphQuad[]>()
  for (const quad of layout.quads) {
    const group = groups.get(quad.font)
    if (group === undefined) groups.set(quad.font, [quad])
    else group.push(quad)
  }

  return [...groups]
}
