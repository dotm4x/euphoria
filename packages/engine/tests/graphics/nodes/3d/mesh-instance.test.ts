import { describe, expect, it } from 'vitest'

import { createContext } from '../2d/harness.js'
import {
  BlendMode,
  Color,
  createBoxMesh,
  Draw3DCommand,
  Environment3D,
  GraphicMaterial,
  LightEnvironment,
  MeshInstance3D,
  Shader,
  ShaderLanguage,
  ShaderStage,
  Vector3,
} from '../../../../source/index.js'

function createMaterial(): GraphicMaterial {
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
    blend: BlendMode.opaque,
  })
}

describe('MeshInstance3D', () => {
  it('draws its mesh with the world transform', () => {
    const material = createMaterial()
    const mesh = createBoxMesh()
    const node = new MeshInstance3D({
      material,
      mesh,
      position: new Vector3(1, 2, 3),
      order: 2,
    })

    const command = node.draw(createContext()).commands[0] as Draw3DCommand

    expect(command).toBeInstanceOf(Draw3DCommand)
    expect(command.mesh).toBe(mesh)
    expect(command.material).toBe(material)
    expect(command.order).toBe(2)
    node.destroy()
    mesh.destroy()
    material.destroy()
  })

  it('inherits material and modulate from visual ancestors', () => {
    const material = createMaterial()
    const mesh = createBoxMesh()
    const parent = new MeshInstance3D({ material, mesh, modulate: new Color(1, 0.5, 1, 1) })
    const child = new MeshInstance3D({ mesh })
    parent.add(child)

    const command = child.draw(createContext()).commands[0] as Draw3DCommand

    expect(command.material).toBe(material)
    expect(command.tint?.g).toBeCloseTo(0.5)
    parent.destroy()
    mesh.destroy()
    material.destroy()
  })

  it('attaches the environment of its ancestors', () => {
    const material = createMaterial()
    const mesh = createBoxMesh()
    const environment = new LightEnvironment()
    const root = new Environment3D({ environment })
    const node = new MeshInstance3D({ material, mesh })
    root.add(node)
    root.load()

    const command = node.draw(createContext()).commands[0] as Draw3DCommand

    expect(command.environment).toBe(environment)
    root.destroy()
    mesh.destroy()
    material.destroy()
  })

  it('fails without a material', () => {
    const mesh = createBoxMesh()
    const node = new MeshInstance3D({ mesh })

    expect(() => node.draw(createContext())).toThrow('requires a material')
    node.destroy()
    mesh.destroy()
  })

  it('stops drawing once its mesh is destroyed', () => {
    const material = createMaterial()
    const mesh = createBoxMesh()
    const node = new MeshInstance3D({ material, mesh })

    expect(node.draw(createContext()).commands).toHaveLength(1)
    mesh.destroy()

    expect(node.draw(createContext()).commands).toHaveLength(0)
    node.destroy()
    material.destroy()
  })
})
