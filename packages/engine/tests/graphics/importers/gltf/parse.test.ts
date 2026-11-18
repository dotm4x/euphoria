import { describe, expect, it } from 'vitest'

import { Model, modelNodeMatrix, parseGltf } from '../../../../source/index.js'

/** Builds a glTF document whose single mesh is one triangle. */
function triangleDocument(): string {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
  const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])
  const bytes = new Uint8Array([
    ...new Uint8Array(positions.buffer),
    ...new Uint8Array(normals.buffer),
  ])
  const base64 = btoa(String.fromCharCode(...bytes))

  return JSON.stringify({
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ name: 'level', nodes: [0] }],
    nodes: [{ name: 'triangle', mesh: 0, translation: [1, 2, 3], scale: [2, 2, 2] }],
    meshes: [
      {
        primitives: [
          {
            attributes: attributesOf({ position: 0, normal: 1 }),
            material: 0,
          },
        ],
      },
    ],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.8, 0.4, 0.2, 1] } }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC3' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 36 },
    ],
    buffers: [{ byteLength: 72, uri: `data:application/octet-stream;base64,${base64}` }],
  })
}

function arrayOf(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer
}

describe('parseGltf', () => {
  it('reads the scene, its nodes and their transforms', () => {
    const model = parseGltf(arrayOf(triangleDocument()))

    expect(model.name).toBe('level')
    expect(model.roots).toHaveLength(1)
    expect(model.roots[0]?.name).toBe('triangle')
    expect(model.roots[0]?.translation).toEqual({ x: 1, y: 2, z: 3 })
    expect(model.roots[0]?.scale).toEqual({ x: 2, y: 2, z: 2 })
  })

  it('reads the geometry of a primitive', () => {
    const mesh = parseGltf(arrayOf(triangleDocument())).roots[0]?.parts[0]?.mesh

    expect(mesh?.vertices).toHaveLength(3)
    expect(mesh?.indices).toEqual([0, 1, 2])
    expect(mesh?.vertices[0]?.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(mesh?.vertices[1]?.position).toEqual({ x: 1, y: 0, z: 0 })
    expect(mesh?.vertices[0]?.normal.z).toBeCloseTo(1)
  })

  it('reads the factors of the material', () => {
    const material = parseGltf(arrayOf(triangleDocument())).materials[0]

    expect(material?.baseColor[0]).toBeCloseTo(0.8)
    expect(material?.baseColor[1]).toBeCloseTo(0.4)
    expect(material?.baseColor[2]).toBeCloseTo(0.2)
    expect(material?.metallic).toBe(1)
    expect(material?.roughness).toBe(1)
    expect(material?.alphaMode).toBe('OPAQUE')
  })

  it('reads a GLB container with its binary chunk', () => {
    const glb = buildGlb(triangleDocument(), 72)

    const model = parseGltf(glb)

    expect(model.roots[0]?.parts[0]?.mesh.vertices).toHaveLength(3)
  })

  it('reads a nested hierarchy', () => {
    const document = JSON.parse(triangleDocument()) as { [key: string]: unknown }
    document.nodes = [
      { name: 'root', children: [1] },
      { name: 'child', mesh: 0 },
    ]
    document.scenes = [{ nodes: [0] }]

    const model = parseGltf(arrayOf(JSON.stringify(document)))

    expect(model.roots[0]?.name).toBe('root')
    expect(model.roots[0]?.children[0]?.name).toBe('child')
    expect(model.roots[0]?.children[0]?.parts).toHaveLength(1)
  })

  it('rejects a file that is not glTF and one without nodes', () => {
    expect(() => parseGltf(arrayOf('{"asset":{}}'))).toThrow(/no nodes/)
    expect(() => parseGltf(arrayOf('not json'))).toThrow()
  })
})

describe('Model', () => {
  it('lists every node and every mesh once', () => {
    const parsed = parseGltf(arrayOf(triangleDocument()))
    const model = new Model({ ...parsed, materials: [], source: 'level.gltf' })

    expect(model.nodes).toHaveLength(1)
    expect(model.meshes).toHaveLength(1)
    expect(model.source).toBe('level.gltf')
    model.destroy()
  })

  it('destroys the geometry it owns', () => {
    const model = new Model({ ...parseGltf(arrayOf(triangleDocument())), materials: [] })
    const [mesh] = model.meshes

    model.destroy()

    expect(mesh?.destroyed).toBe(true)
  })

  it('builds the matrix of a node from its scale and translation', () => {
    const matrix = modelNodeMatrix({ x: 1, y: 2, z: 3 } as never, { x: 0, y: 0, z: 0, w: 1 }, {
      x: 2,
      y: 2,
      z: 2,
    } as never)

    expect(matrix.m11).toBeCloseTo(2)
    expect(matrix.m41).toBeCloseTo(1)
    expect(matrix.m42).toBeCloseTo(2)
    expect(matrix.m43).toBeCloseTo(3)
  })
})

/** Builds a GLB container around a document and an empty binary chunk. */
function buildGlb(document: string, binaryLength: number): ArrayBuffer {
  const json = new TextEncoder().encode(document)
  const padding = (4 - (json.length % 4)) % 4
  const jsonLength = json.length + padding
  const binary = new Uint8Array(binaryLength)
  const total = 12 + 8 + jsonLength + 8 + binary.length
  const buffer = new ArrayBuffer(total)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, jsonLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  bytes.set(json, 20)
  for (let index = json.length; index < jsonLength; index++) bytes[20 + index] = 0x20
  const binaryStart = 20 + jsonLength
  view.setUint32(binaryStart, binary.length, true)
  view.setUint32(binaryStart + 4, 0x004e4942, true)
  bytes.set(binary, binaryStart + 8)

  return buffer
}

/** Builds the attribute map glTF uses, whose keys are uppercase by spec. */
function attributesOf({ position, normal }: { position: number; normal: number }): {
  [name: string]: number
} {
  const attributes: { [name: string]: number } = {}
  Reflect.set(attributes, 'POSITION', position)
  Reflect.set(attributes, 'NORMAL', normal)

  return attributes
}
