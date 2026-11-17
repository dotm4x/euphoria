import { describe, expect, it } from 'vitest'

import {
  BlendMode,
  Color,
  createBoxMesh,
  Draw3DCommand,
  GraphicMaterial,
  isSortable,
  type Light,
  LightEnvironment,
  LightKind,
  Matrix4x4,
  Shader,
  ShaderLanguage,
  ShaderStage,
  Vector3,
} from '../../../source/index.js'

function createMaterial(blend: BlendMode = BlendMode.opaque): GraphicMaterial {
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

function createProjection(): Matrix4x4 {
  return Matrix4x4.perspectiveFieldOfView(Math.PI / 3, 1, 0.1, 100)
}

function createCommand(
  z: number,
  material: GraphicMaterial,
  environment?: LightEnvironment,
): Draw3DCommand {
  return new Draw3DCommand({
    mesh: createBoxMesh(),
    material,
    transform: Matrix4x4.translation(0, 0, z),
    ...(environment === undefined ? {} : { environment }),
  })
}

describe('Draw3DCommand', () => {
  it('sorts by distance from the camera', () => {
    const material = createMaterial()
    const near = createCommand(-5, material)
    const far = createCommand(-50, material)

    expect(near.sortDepth(Matrix4x4.identity)).toBeLessThan(far.sortDepth(Matrix4x4.identity))
    expect(isSortable(near)).toBe(true)
    material.destroy()
  })

  it('culls geometry behind or outside the camera', () => {
    const material = createMaterial()
    const projection = createProjection()

    expect(createCommand(-5, material).isVisible(projection)).toBe(true)
    expect(createCommand(5, material).isVisible(projection)).toBe(false)
    expect(createCommand(-500, material).isVisible(projection)).toBe(false)
    expect(
      new Draw3DCommand({
        mesh: createBoxMesh(),
        material,
        transform: Matrix4x4.translation(500, 0, -5),
      }).isVisible(projection),
    ).toBe(false)
    material.destroy()
  })

  it('reports transparency and keeps its environment', () => {
    const opaque = createMaterial(BlendMode.opaque)
    const environment = new LightEnvironment({ ambient: Color.white })
    const command = createCommand(-5, opaque, environment)

    expect(command.transparent).toBe(false)
    expect(command.environment).toBe(environment)
    expect(command.batchKey).toBe(opaque)
    opaque.destroy()
    environment.destroy()
  })

  it('uses the camera view for depth', () => {
    const material = createMaterial()
    const view = Matrix4x4.translation(0, 0, 10)
    const command = createCommand(-20, material)

    expect(command.sortDepth(view)).toBeCloseTo(10)
    material.destroy()
  })
})

describe('LightEnvironment', () => {
  const light = (kind: LightKind): Light => ({
    kind,
    color: Color.white,
    position: new Vector3(0, 0, 0),
    direction: new Vector3(0, 0, -1),
    range: 10,
    coneCosine: 0.5,
  })

  it('stores one directional light and punctual slots', () => {
    const environment = new LightEnvironment()
    environment.setDirectional(light(LightKind.directional))
    const first = environment.addPunctual(light(LightKind.omni))
    environment.addPunctual(light(LightKind.spot))

    expect(environment.directional?.kind).toBe(LightKind.directional)
    expect(environment.punctual).toHaveLength(2)
    environment.removePunctual(first)
    expect(environment.punctual).toHaveLength(1)
    environment.destroy()
  })

  it('validates kinds and slots', () => {
    const environment = new LightEnvironment()

    expect(() => {
      environment.setDirectional(light(LightKind.omni))
    }).toThrow('directional')
    expect(() => environment.addPunctual(light(LightKind.directional))).toThrow('Directional')
    expect(() => {
      environment.updatePunctual(8, light(LightKind.omni))
    }).toThrow('zero to seven')
    expect(() => {
      environment.removePunctual(-1)
    }).toThrow('zero to seven')
    environment.destroy()
  })

  it('clears lights and keeps the ambient color', () => {
    const environment = new LightEnvironment({ ambient: Color.white })
    environment.setDirectional(light(LightKind.directional))
    environment.addPunctual(light(LightKind.omni))

    environment.clear()

    expect(environment.directional).toBeUndefined()
    expect(environment.punctual).toHaveLength(0)
    expect(environment.ambient).toEqual(Color.white)
    environment.destroy()
  })
})
