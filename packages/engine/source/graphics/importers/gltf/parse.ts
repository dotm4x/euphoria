import { Vector2 } from '#/math/primitives/vectors/vector2.js'
import { Vector3 } from '#/math/primitives/vectors/vector3.js'

import { GraphicMesh3D } from '../../geometry/mesh3d.js'
import { Vertex3D } from '../../geometry/vertex3d.js'

/** Size in bytes of every component type glTF defines. */
const componentSizes: ReadonlyMap<number, number> = new Map([
  [5120, 1],
  [5121, 1],
  [5122, 2],
  [5123, 2],
  [5125, 4],
  [5126, 4],
])

/** Rotation of a node, as the quaternion the file stores. */
export interface ModelRotation {
  /** First component of the quaternion. */
  readonly x: number
  /** Second component of the quaternion. */
  readonly y: number
  /** Third component of the quaternion. */
  readonly z: number
  /** Real part of the quaternion. */
  readonly w: number
}

/** One drawable piece of a node: a primitive and the material it uses. */
export interface ModelPart {
  /** Geometry of the piece. */
  readonly mesh: GraphicMesh3D
  /** Index of the material in the model, or undefined when the file names none. */
  readonly material: number | undefined
}

/** A node of a parsed model. */
export interface ModelNode {
  /** Name of the node, or an empty string when it has none. */
  readonly name: string
  /** Translation of the node, in its parent space. */
  readonly translation: Vector3
  /** Rotation of the node, in its parent space. */
  readonly rotation: ModelRotation
  /** Scale of the node, in its parent space. */
  readonly scale: Vector3
  /** Pieces the node draws, in the order the file declares them. */
  readonly parts: readonly ModelPart[]
  /** Children of the node, in the order the file declares them. */
  readonly children: readonly ModelNode[]
}

/** Encoded bytes of one map of a material. */
export interface ModelImage {
  /** Encoded bytes of the image. */
  readonly data: ArrayBuffer
  /** Media type of the bytes, such as `image/png`. */
  readonly type: string
}

/** A material read from the file, with its maps still encoded. */
export interface ModelMaterial {
  /** Name of the material, or an empty string when it has none. */
  readonly name: string
  /** Base color factor. */
  readonly baseColor: readonly [number, number, number, number]
  /** Base color map. */
  readonly baseColorMap: ModelImage | undefined
  /** Metallic factor. */
  readonly metallic: number
  /** Roughness factor. */
  readonly roughness: number
  /** Map that packs occlusion, roughness and metallic in its channels. */
  readonly metallicRoughnessMap: ModelImage | undefined
  /** Tangent-space normal map. */
  readonly normalMap: ModelImage | undefined
  /** Strength of the normal map. */
  readonly normalScale: number
  /** Map that occludes ambient light. */
  readonly occlusionMap: ModelImage | undefined
  /** Strength of the occlusion channel. */
  readonly occlusionStrength: number
  /** Emissive factor. */
  readonly emissive: readonly [number, number, number]
  /** Emissive map. */
  readonly emissiveMap: ModelImage | undefined
  /** How transparency is handled: `OPAQUE`, `MASK` or `BLEND`. */
  readonly alphaMode: string
  /** Alpha below which a masked fragment is discarded. */
  readonly alphaCutoff: number
  /** Whether both faces are drawn. */
  readonly doubleSided: boolean
}

/** A model read from a glTF or GLB file. */
export interface ParsedModel {
  /** Name of the scene that was read, or an empty string. */
  readonly name: string
  /** Roots of the scene, in the order the file declares them. */
  readonly roots: readonly ModelNode[]
  /** Materials the nodes refer to, in file order. */
  readonly materials: readonly ModelMaterial[]
}

/** glTF document, as far as this parser reads it. */
interface GltfDocument {
  readonly scene?: number
  readonly scenes?: readonly { readonly name?: string; readonly nodes?: readonly number[] }[]
  readonly nodes?: readonly GltfNode[]
  readonly meshes?: readonly GltfMesh[]
  readonly accessors?: readonly GltfAccessor[]
  readonly bufferViews?: readonly GltfBufferView[]
  readonly buffers?: readonly GltfBuffer[]
  readonly materials?: readonly GltfMaterial[]
  readonly textures?: readonly { readonly source?: number; readonly sampler?: number }[]
  readonly images?: readonly GltfImage[]
  readonly samplers?: readonly GltfSampler[]
}

interface GltfImage {
  readonly uri?: string
  readonly mimeType?: string
  readonly bufferView?: number
}

interface GltfSampler {
  readonly magFilter?: number
  readonly minFilter?: number
  readonly wrapS?: number
  readonly wrapT?: number
}

interface GltfNode {
  readonly name?: string
  readonly mesh?: number
  readonly children?: readonly number[]
  readonly translation?: readonly number[]
  readonly rotation?: readonly number[]
  readonly scale?: readonly number[]
  readonly matrix?: readonly number[]
}

interface GltfMesh {
  readonly primitives: readonly GltfPrimitive[]
}

interface GltfPrimitive {
  readonly attributes: { readonly [name: string]: number }
  readonly indices?: number
  readonly mode?: number
  readonly material?: number
}

interface GltfAccessor {
  readonly componentType: number
  readonly count: number
  readonly type: string
  readonly bufferView?: number
  readonly byteOffset?: number
}

interface GltfBufferView {
  readonly buffer: number
  readonly byteLength: number
  readonly byteOffset?: number
  readonly byteStride?: number
}

interface GltfBuffer {
  readonly byteLength: number
  readonly uri?: string
}

interface GltfMaterial {
  readonly name?: string
  readonly pbrMetallicRoughness?: {
    readonly baseColorFactor?: readonly number[]
    readonly baseColorTexture?: { readonly index: number }
    readonly metallicFactor?: number
    readonly roughnessFactor?: number
    readonly metallicRoughnessTexture?: { readonly index: number }
  }
  readonly normalTexture?: { readonly index: number; readonly scale?: number }
  readonly occlusionTexture?: { readonly index: number; readonly strength?: number }
  readonly emissiveTexture?: { readonly index: number }
  readonly emissiveFactor?: readonly number[]
  readonly alphaMode?: string
  readonly alphaCutoff?: number
  readonly doubleSided?: boolean
}

/** Document and the payload of its buffers. */
interface GltfSource {
  readonly document: GltfDocument
  readonly buffers: readonly (ArrayBuffer | undefined)[]
}

/**
 * Reads a glTF or GLB file into nodes, geometry and material colors.
 *
 * Only what a level needs is read: the scene graph, triangle geometry with
 * positions, normals and one texture coordinate set, and the base color of each
 * material as a tint. Skinning, animations, morph targets and images are not
 * read yet, so a file that uses them still loads, without them.
 *
 * @param data - Bytes of the file, either a `.gltf` document or a `.glb` container.
 * @returns The scene name and its roots.
 * @throws {@link Error} If the data is not glTF, has no nodes, or needs an external buffer.
 */
export function parseGltf(data: ArrayBuffer): ParsedModel {
  const source = readSource(data)
  const sceneIndex = source.document.scene ?? 0
  const scene = source.document.scenes?.[sceneIndex]
  const declared = scene?.nodes ?? []
  const materials = (source.document.materials ?? []).map((material) =>
    readMaterial(source, material),
  )
  const roots = declared.flatMap((index) => readNode(source, index, []))
  if (roots.length > 0) return { name: scene?.name ?? '', roots, materials }

  const first = readNode(source, 0, [])
  if (first.length === 0) throw new Error('The glTF file has no nodes to draw.')

  return { name: scene?.name ?? '', roots: first, materials }
}

function readSource(data: ArrayBuffer): GltfSource {
  const view = new DataView(data)
  if (data.byteLength > 12 && view.getUint32(0, true) === 0x46546c67) return readGlb(view)
  const document = JSON.parse(new TextDecoder().decode(data)) as GltfDocument

  return { document, buffers: (document.buffers ?? []).map((buffer) => uriBuffer(buffer)) }
}

function readGlb(view: DataView): GltfSource {
  const length = view.getUint32(8, true)
  let offset = 12
  let document: GltfDocument | undefined
  let binary: ArrayBuffer | undefined
  while (offset + 8 <= length) {
    const chunkLength = view.getUint32(offset, true)
    const type = view.getUint32(offset + 4, true)
    const body = offset + 8
    if (type === 0x4e4f534a) {
      document = JSON.parse(
        new TextDecoder().decode(new Uint8Array(view.buffer, view.byteOffset + body, chunkLength)),
      ) as GltfDocument
    } else if (type === 0x004e4942) {
      const chunk = new Uint8Array(view.buffer, view.byteOffset + body, chunkLength)
      binary = chunk.slice().buffer
    }

    offset = body + chunkLength
  }

  if (document === undefined) throw new Error('The GLB file has no JSON chunk.')

  return {
    document,
    buffers: (document.buffers ?? []).map((buffer, index) =>
      index === 0 && buffer.uri === undefined ? binary : uriBuffer(buffer),
    ),
  }
}

function uriBuffer(buffer: GltfBuffer): ArrayBuffer | undefined {
  const uri = buffer.uri
  if (uri === undefined) return undefined
  const [header, payload] = uri.split(',', 2)
  if (!header?.includes('base64') || payload === undefined) return undefined
  const decoded = atob(payload)
  const bytes = new Uint8Array(decoded.length)
  for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index)

  return bytes.buffer
}

function readNode(
  source: GltfSource,
  index: number,
  path: readonly number[],
): readonly ModelNode[] {
  if (path.includes(index)) throw new Error('The glTF scene graph has a cycle.')
  const node = source.document.nodes?.[index]
  if (node === undefined) return []
  const transform = nodeTransformOf(node)

  return [
    {
      name: node.name ?? '',
      translation: transform.translation,
      rotation: transform.rotation,
      scale: transform.scale,
      parts: node.mesh === undefined ? [] : readMesh(source, node.mesh),
      children: (node.children ?? []).flatMap((child) => readNode(source, child, [...path, index])),
    },
  ]
}

/**
 * Reads the transform of a node, which the file states either as a matrix or as
 * a translation, a rotation and a scale.
 *
 * @param node - Node of the document.
 * @returns The translation, rotation and scale of the node.
 */
function nodeTransformOf(node: GltfNode): {
  readonly translation: Vector3
  readonly rotation: ModelRotation
  readonly scale: Vector3
} {
  const matrix = node.matrix
  if (matrix === undefined) {
    return {
      translation: pointOf(node.translation),
      rotation: rotationOf(node.rotation),
      scale: vectorOf(node.scale),
    }
  }

  const at = (position: number): number => matrix[position] ?? 0
  const scale = new Vector3(
    Math.hypot(at(0), at(1), at(2)),
    Math.hypot(at(4), at(5), at(6)),
    Math.hypot(at(8), at(9), at(10)),
  )
  const trace = at(0) / nonzero(scale.x) + at(5) / nonzero(scale.y) + at(10) / nonzero(scale.z)
  const w = Math.sqrt(Math.max(1 + trace, 1e-8)) / 2
  const x = (at(6) / nonzero(scale.y) - at(9) / nonzero(scale.z)) / (4 * w)
  const y = (at(8) / nonzero(scale.z) - at(2) / nonzero(scale.x)) / (4 * w)
  const z = (at(1) / nonzero(scale.x) - at(4) / nonzero(scale.y)) / (4 * w)

  return { translation: new Vector3(at(12), at(13), at(14)), rotation: { x, y, z, w }, scale }
}

function nonzero(value: number): number {
  return Math.abs(value) < 1e-8 ? 1e-8 : value
}

/**
 * Reads the material of a document, keeping its maps encoded.
 *
 * @param source - Document and buffers.
 * @param material - Material of the document.
 * @returns The material, with the bytes of every map it uses.
 */
function readMaterial(source: GltfSource, material: GltfMaterial): ModelMaterial {
  const pbr = material.pbrMetallicRoughness
  const factor = pbr?.baseColorFactor
  const emissive = material.emissiveFactor

  return {
    name: material.name ?? '',
    baseColor: [factor?.[0] ?? 1, factor?.[1] ?? 1, factor?.[2] ?? 1, factor?.[3] ?? 1],
    baseColorMap: readMap(source, pbr?.baseColorTexture?.index),
    metallic: pbr?.metallicFactor ?? 1,
    roughness: pbr?.roughnessFactor ?? 1,
    metallicRoughnessMap: readMap(source, pbr?.metallicRoughnessTexture?.index),
    normalMap: readMap(source, material.normalTexture?.index),
    normalScale: material.normalTexture?.scale ?? 1,
    occlusionMap: readMap(source, material.occlusionTexture?.index),
    occlusionStrength: material.occlusionTexture?.strength ?? 1,
    emissive: [emissive?.[0] ?? 0, emissive?.[1] ?? 0, emissive?.[2] ?? 0],
    emissiveMap: readMap(source, material.emissiveTexture?.index),
    alphaMode: material.alphaMode ?? 'OPAQUE',
    alphaCutoff: material.alphaCutoff ?? 0.5,
    doubleSided: material.doubleSided ?? false,
  }
}

/**
 * Resolves the bytes of a texture of the document.
 *
 * @param source - Document and buffers.
 * @param index - Index of the texture.
 * @returns The encoded image, or undefined when the file does not carry it.
 */
function readMap(source: GltfSource, index: number | undefined): ModelImage | undefined {
  if (index === undefined) return undefined
  const texture = source.document.textures?.[index]
  const image = texture?.source === undefined ? undefined : source.document.images?.[texture.source]
  if (image === undefined) return undefined
  if (image.bufferView !== undefined) {
    const view = source.document.bufferViews?.[image.bufferView]
    const buffer = view === undefined ? undefined : source.buffers[view.buffer]
    if (view === undefined || buffer === undefined) return undefined
    const start = view.byteOffset ?? 0

    return {
      data: buffer.slice(start, start + view.byteLength),
      type: image.mimeType ?? 'image/png',
    }
  }

  const uri = image.uri
  if (uri === undefined) return undefined
  const [header, payload] = uri.split(',', 2)
  if (!header?.includes('base64') || payload === undefined) return undefined
  const decoded = atob(payload)
  const bytes = new Uint8Array(decoded.length)
  for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index)
  const type = header.slice(header.indexOf(':') + 1, header.indexOf(';'))

  return { data: bytes.buffer, type }
}

/**
 * Reads the primitives of a mesh, one piece per primitive.
 *
 * A primitive is one draw with one material, so merging them would lose every
 * material but the first: each one becomes a mesh of its own instead.
 *
 * @param source - Document and buffers.
 * @param index - Index of the mesh.
 * @returns One piece per triangle primitive that carries positions.
 */
function readMesh(source: GltfSource, index: number): readonly ModelPart[] {
  const mesh = source.document.meshes?.[index]
  if (mesh === undefined) return []
  const parts: ModelPart[] = []
  for (const primitive of mesh.primitives) {
    if (primitive.mode !== undefined && primitive.mode !== 4) continue
    const positionIndex = primitive.attributes.POSITION
    if (positionIndex === undefined) continue
    const positions = readAccessor(source, positionIndex)
    if (positions.length === 0) continue
    const normalIndex = primitive.attributes.NORMAL
    const uvIndex = primitive.attributes.TEXCOORD_0
    const normals = normalIndex === undefined ? [] : readAccessor(source, normalIndex)
    const uvs = uvIndex === undefined ? [] : readAccessor(source, uvIndex)
    const vertices = positions.map(
      (position, vertex) => new Vertex3D(position, normalAt(normals[vertex]), uvAt(uvs[vertex])),
    )
    const triangles =
      primitive.indices === undefined ? undefined : readAccessor(source, primitive.indices)
    const indices: number[] = []
    if (triangles === undefined) {
      for (let offset = 0; offset + 2 < positions.length; offset += 3) {
        indices.push(offset, offset + 1, offset + 2)
      }
    } else {
      for (const triangle of triangles) indices.push(triangle.x)
    }

    parts.push({
      mesh: new GraphicMesh3D(vertices, indices),
      material: primitive.material,
    })
  }

  return parts
}

function readAccessor(source: GltfSource, index: number): readonly Vector3[] {
  const accessor = source.document.accessors?.[index]
  const view =
    accessor?.bufferView === undefined
      ? undefined
      : source.document.bufferViews?.[accessor.bufferView]
  if (accessor === undefined || view === undefined) return []
  const buffer = source.buffers[view.buffer]
  if (buffer === undefined) {
    throw new Error('A glTF accessor needs a buffer the file does not embed.')
  }

  const size = componentSizes.get(accessor.componentType)
  if (size === undefined) return []
  const components = componentCount(accessor.type)
  const stride = view.byteStride ?? size * components
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const view32 = new DataView(buffer)
  const values: Vector3[] = []
  for (let element = 0; element < accessor.count; element++) {
    const base = start + element * stride
    const read = (component: number): number =>
      component < components
        ? readComponent(view32, base + component * size, accessor.componentType)
        : 0
    values.push(new Vector3(read(0), read(1), read(2)))
  }

  return values
}

function readComponent(view: DataView, offset: number, componentType: number): number {
  switch (componentType) {
    case 5120:
      return view.getInt8(offset)
    case 5121:
      return view.getUint8(offset)
    case 5122:
      return view.getInt16(offset, true)
    case 5123:
      return view.getUint16(offset, true)
    case 5125:
      return view.getUint32(offset, true)
    default:
      return view.getFloat32(offset, true)
  }
}

function componentCount(type: string): number {
  switch (type) {
    case 'VEC2':
      return 2
    case 'VEC3':
      return 3
    case 'VEC4':
      return 4
    default:
      return 1
  }
}

function pointOf(value: readonly number[] | undefined): Vector3 {
  return new Vector3(value?.[0] ?? 0, value?.[1] ?? 0, value?.[2] ?? 0)
}

function vectorOf(value: readonly number[] | undefined): Vector3 {
  return value === undefined ? new Vector3(1, 1, 1) : pointOf(value)
}

function rotationOf(value: readonly number[] | undefined): ModelRotation {
  return {
    x: value?.[0] ?? 0,
    y: value?.[1] ?? 0,
    z: value?.[2] ?? 0,
    w: value?.[3] ?? 1,
  }
}

function normalAt(value: Vector3 | undefined): Vector3 {
  if (value !== undefined && value.squaredMagnitude > 0) return value

  return new Vector3(0, 1, 0)
}

function uvAt(value: Vector3 | undefined): Vector2 {
  return new Vector2(value?.x ?? 0, value?.y ?? 0)
}
