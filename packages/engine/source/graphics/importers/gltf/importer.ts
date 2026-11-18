import { fetchSource } from '#/modules/assets/helpers/fetch.js'
import { AssetImporter, type ImportedAsset } from '#/modules/assets/importer.js'

import { Color } from '../../primitives/color.js'
import { Model } from '../../resources/model.js'
import { PbrAlphaMode, PbrMaterial } from '../../resources/pbr.js'
import { decodeImageBytes } from '../image.js'

import { type ModelMaterial, parseGltf } from './parse.js'

/**
 * Loads glTF and GLB files into models.
 *
 * The model keeps the geometry, the node hierarchy and the materials of the
 * file, not a scene: a game decides where each node goes and which material
 * draws it, the same way it does with a procedural mesh. Every map is decoded
 * here, so drawing a model never touches the image decoder.
 */
export class GltfImporter extends AssetImporter<Model> {
  public constructor() {
    super({ identifier: 'gltf', extensions: ['gltf', 'glb'] })
  }

  /** @inheritDoc */
  public override async load(source: string, signal: AbortSignal): Promise<ImportedAsset<Model>> {
    const response = await fetchSource(source, signal)
    const data = await response.arrayBuffer()
    signal.throwIfAborted()
    const parsed = parseGltf(data)
    const materials = await Promise.all(
      parsed.materials.map((material) => this.materialOf(material, signal)),
    )
    signal.throwIfAborted()
    const model = new Model({ ...parsed, materials, source })

    return {
      value: model,
      release: () => {
        if (!model.destroyed) model.destroy()
      },
    }
  }

  private async materialOf(material: ModelMaterial, signal: AbortSignal): Promise<PbrMaterial> {
    const [baseColor, metallicRoughness, normal, occlusion, emissive] = await Promise.all([
      decode(material.baseColorMap, signal),
      decode(material.metallicRoughnessMap, signal),
      decode(material.normalMap, signal),
      decode(material.occlusionMap, signal),
      decode(material.emissiveMap, signal),
    ])
    const [r, g, b, a] = material.baseColor
    const [er, eg, eb] = material.emissive

    return new PbrMaterial({
      name: material.name,
      baseColor: new Color(r, g, b, a),
      baseColorMap: baseColor,
      metallic: material.metallic,
      roughness: material.roughness,
      metallicRoughnessMap: metallicRoughness,
      normalMap: normal,
      normalScale: material.normalScale,
      occlusionMap: occlusion,
      occlusionStrength: material.occlusionStrength,
      emissive: new Color(er, eg, eb, 1),
      emissiveMap: emissive,
      alphaMode: alphaModeOf(material.alphaMode, material.baseColorMap !== undefined),
      alphaCutoff: material.alphaCutoff,
    })
  }
}

async function decode(
  image: ModelMaterial['baseColorMap'],
  signal: AbortSignal,
): Promise<ReturnType<typeof decodeImageBytes> extends Promise<infer T> ? T : never> {
  if (image === undefined) return undefined as never
  const decoded = await decodeImageBytes(image.data, image.type)
  if (signal.aborted) {
    decoded.destroy()
    signal.throwIfAborted()
  }

  return decoded
}

function alphaModeOf(mode: string, textured: boolean): PbrAlphaMode {
  if (mode === 'MASK') return PbrAlphaMode.mask
  if (mode === 'BLEND') return PbrAlphaMode.blend

  return textured ? PbrAlphaMode.opaque : PbrAlphaMode.opaque
}
