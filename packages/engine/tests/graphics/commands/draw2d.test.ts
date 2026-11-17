import { describe, expect, it } from 'vitest'

import {
  BlendMode,
  Camera2D,
  Color,
  Draw2DCommand,
  GraphicMaterial,
  GraphicMesh2D,
  GraphicVertex2D,
  isSortable,
  Matrix3x2,
  Matrix4x4,
  Shader,
  ShaderLanguage,
  ShaderStage,
  Vector2,
  Viewport,
} from '../../../source/index.js'

function createMaterial(blend: BlendMode = BlendMode.alpha): GraphicMaterial {
  return new GraphicMaterial({
    vertexShader: new Shader({
      code: 'vertex',
      language: ShaderLanguage.glsl,
      stage: ShaderStage.vertex,
    }),
    fragmentShader: new Shader({
      code: 'fragment',
      language: ShaderLanguage.glsl,
      stage: ShaderStage.fragment,
    }),
    blend,
  })
}

function createMesh(x: number): GraphicMesh2D {
  return new GraphicMesh2D([
    new GraphicVertex2D(new Vector2(x - 1, -1), new Vector2(0, 0), Color.white),
    new GraphicVertex2D(new Vector2(x + 1, -1), new Vector2(1, 0), Color.white),
    new GraphicVertex2D(new Vector2(x, 1), new Vector2(0, 1), Color.white),
  ])
}

function viewProjection(): Matrix4x4 {
  const camera = new Camera2D()
  const viewport = new Viewport(new Vector2(0, 0), new Vector2(10, 10))

  return camera.view.multiply(camera.getProjection(viewport))
}

describe('Draw2DCommand', () => {
  it('reports the visibility of the transformed bounds', () => {
    const material = createMaterial()
    const projection = viewProjection()
    const inside = new Draw2DCommand({
      mesh: createMesh(0),
      material,
      transform: Matrix3x2.identity,
    })
    const outside = new Draw2DCommand({
      mesh: createMesh(5000),
      material,
      transform: Matrix3x2.identity,
    })

    expect(isSortable(inside)).toBe(true)
    expect(inside.isVisible(projection)).toBe(true)
    expect(outside.isVisible(projection)).toBe(false)
    material.destroy()
  })

  it('uses its depth for depth sorting and the material as batch key', () => {
    const material = createMaterial()
    const command = new Draw2DCommand({
      mesh: createMesh(0),
      material,
      transform: Matrix3x2.identity,
      depth: 7,
    })

    expect(command.sortDepth(Matrix4x4.identity)).toBe(7)
    expect(command.batchKey).toBe(material)
    material.destroy()
  })

  it('reports transparency from the blend override or the material', () => {
    const opaque = createMaterial(BlendMode.opaque)
    const transparent = createMaterial(BlendMode.alpha)
    const command = (material: GraphicMaterial, blend?: BlendMode): Draw2DCommand =>
      new Draw2DCommand({
        mesh: createMesh(0),
        material,
        transform: Matrix3x2.identity,
        ...(blend === undefined ? {} : { blend }),
      })

    expect(command(opaque).transparent).toBe(false)
    expect(command(opaque, BlendMode.additive).transparent).toBe(true)
    expect(command(transparent).transparent).toBe(true)
    opaque.destroy()
    transparent.destroy()
  })

  it('is orderable through the space pipeline', () => {
    const material = createMaterial()
    const command = new Draw2DCommand({
      mesh: createMesh(0),
      material,
      transform: Matrix3x2.identity,
      order: 4,
    })
    expect(command.order).toBe(4)
    material.destroy()
  })
})
