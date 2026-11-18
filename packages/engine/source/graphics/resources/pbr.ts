import { Color } from '../primitives/color.js'

import { BlendMode } from './blend-mode.js'
import { Image } from './image.js'
import { type GraphicMaterial } from './material.js'
import { createPbrMaterial, neutralPixels } from './pbr-shader.js'
import { TextureBinding } from './textures/binding.js'
import { ImageTexture } from './textures/image.js'
import { TextureSampler } from './textures/sampler.js'

/** How a physical material treats transparency, following glTF. */
export enum PbrAlphaMode {
  /** The material is fully opaque and never blends. */
  opaque = 'opaque',
  /** Fragments below the cutoff are discarded and the rest are opaque. */
  mask = 'mask',
  /** The material blends with the destination. */
  blend = 'blend',
}

/** Configuration for a physical material. */
export interface PbrMaterialOptions {
  /** Name of the material, used in diagnostics; defaults to an empty string. */
  readonly name?: string
  /** Base color multiplied with the base color map; defaults to white. */
  readonly baseColor?: Color
  /** Base color map. */
  readonly baseColorMap?: Image | undefined
  /** Metallic factor, from `0` to `1`; defaults to `1`. */
  readonly metallic?: number
  /** Roughness factor, from `0` to `1`; defaults to `1`. */
  readonly roughness?: number
  /** Map whose green channel is roughness, blue is metallic and red is occlusion. */
  readonly metallicRoughnessMap?: Image | undefined
  /** Tangent-space normal map. */
  readonly normalMap?: Image | undefined
  /** Strength of the normal map; defaults to `1`. */
  readonly normalScale?: number
  /** Map whose red channel occludes ambient light. */
  readonly occlusionMap?: Image | undefined
  /** Strength of the occlusion channel; defaults to `1`. */
  readonly occlusionStrength?: number
  /** Color added after lighting; defaults to black. */
  readonly emissive?: Color
  /** Emissive map, multiplied by {@link emissive}. */
  readonly emissiveMap?: Image | undefined
  /** How transparency is handled; defaults to opaque. */
  readonly alphaMode?: PbrAlphaMode
  /** Alpha below which a masked fragment is discarded; defaults to `0.5`. */
  readonly alphaCutoff?: number
  /** Exposure applied before the tone map; defaults to `1`. */
  readonly exposure?: number
}

/** Sampler used by every material map: linear filtering with mipmaps. */
const mapSampler: TextureSampler = new TextureSampler({ mipmaps: true })

/** Binding of the one-pixel white map, shared because it never changes. */
let neutralBinding: TextureBinding | undefined

/**
 * A physically based surface, as a value.
 *
 * The descriptor is data: maps, factors and how transparency is handled. Turning
 * it into a material needs the renderer, which owns the textures, so a model can
 * ship descriptors and a scene decides when to build the material.
 */
export class PbrMaterial {
  /** Name of the material. */
  public readonly name: string

  /** Base color multiplied with the base color map. */
  public readonly baseColor: Color

  /** Base color map. */
  public readonly baseColorMap: Image | undefined

  /** Metallic factor. */
  public readonly metallic: number

  /** Roughness factor. */
  public readonly roughness: number

  /** Map that packs roughness, metallic and occlusion. */
  public readonly metallicRoughnessMap: Image | undefined

  /** Tangent-space normal map. */
  public readonly normalMap: Image | undefined

  /** Strength of the normal map. */
  public readonly normalScale: number

  /** Map that occludes ambient light. */
  public readonly occlusionMap: Image | undefined

  /** Strength of the occlusion channel. */
  public readonly occlusionStrength: number

  /** Color added after lighting. */
  public readonly emissive: Color

  /** Emissive map. */
  public readonly emissiveMap: Image | undefined

  /** How transparency is handled. */
  public readonly alphaMode: PbrAlphaMode

  /** Alpha below which a masked fragment is discarded. */
  public readonly alphaCutoff: number

  /** Exposure applied before the tone map. */
  public readonly exposure: number

  /**
   * @param options - Maps, factors and transparency of the surface.
   * @throws {@link RangeError} If a factor is outside the range it accepts.
   */
  public constructor({
    name = '',
    baseColor = Color.white,
    baseColorMap,
    metallic = 1,
    roughness = 1,
    metallicRoughnessMap,
    normalMap,
    normalScale = 1,
    occlusionMap,
    occlusionStrength = 1,
    emissive = Color.black,
    emissiveMap,
    alphaMode = PbrAlphaMode.opaque,
    alphaCutoff = 0.5,
    exposure = 1,
  }: PbrMaterialOptions = {}) {
    for (const [label, value] of [
      ['metallic', metallic],
      ['roughness', roughness],
      ['normalScale', normalScale],
      ['occlusionStrength', occlusionStrength],
      ['alphaCutoff', alphaCutoff],
      ['exposure', exposure],
    ] as const) {
      if (!Number.isFinite(value) || value < 0) {
        throw new RangeError(`A physical material ${label} must be finite and non-negative.`)
      }
    }

    this.name = name
    this.baseColor = baseColor
    this.baseColorMap = baseColorMap
    this.metallic = metallic
    this.roughness = roughness
    this.metallicRoughnessMap = metallicRoughnessMap
    this.normalMap = normalMap
    this.normalScale = normalScale
    this.occlusionMap = occlusionMap
    this.occlusionStrength = occlusionStrength
    this.emissive = emissive
    this.emissiveMap = emissiveMap
    this.alphaMode = alphaMode
    this.alphaCutoff = alphaCutoff
    this.exposure = exposure
  }

  /** Images this material owns, so a model can release them together. */
  public get maps(): readonly Image[] {
    return [
      ...(this.baseColorMap === undefined ? [] : [this.baseColorMap]),
      ...(this.metallicRoughnessMap === undefined ? [] : [this.metallicRoughnessMap]),
      ...(this.normalMap === undefined ? [] : [this.normalMap]),
      ...(this.occlusionMap === undefined ? [] : [this.occlusionMap]),
      ...(this.emissiveMap === undefined ? [] : [this.emissiveMap]),
    ]
  }

  /**
   * Creates the material the renderer draws with.
   *
   * @returns A material that samples every map the surface declares.
   */
  public createMaterial(): GraphicMaterial {
    const occlusion = this.occlusionMap ?? this.metallicRoughnessMap
    const blend = this.alphaMode === PbrAlphaMode.blend ? BlendMode.alpha : BlendMode.opaque

    return createPbrMaterial(
      [
        bind(this.baseColorMap),
        bind(this.metallicRoughnessMap),
        bind(this.normalMap),
        bind(this.emissiveMap),
      ],
      {
        baseColor: this.baseColor,
        metallic: this.metallic,
        roughness: this.roughness,
        emissive: this.emissive,
        normalScale: this.normalScale,
        occlusionStrength: occlusion === undefined ? 0 : this.occlusionStrength,
        alphaCutoff: this.alphaMode === PbrAlphaMode.mask ? this.alphaCutoff : 0,
        exposure: this.exposure,
        metallicRoughnessMap: this.metallicRoughnessMap !== undefined,
        normalMap: this.normalMap !== undefined,
        emissiveMap: this.emissiveMap !== undefined,
      },
      blend,
      neutral(),
    )
  }
}

function bind(image: Image | undefined): TextureBinding | undefined {
  return image === undefined ? undefined : new TextureBinding(new ImageTexture(image), mapSampler)
}

function neutral(): TextureBinding {
  neutralImage ??= new Image(1, 1, neutralPixels.slice())
  neutralBinding ??= new TextureBinding(new ImageTexture(neutralImage), mapSampler)

  return neutralBinding
}

/** One-pixel image every material without maps samples. */
let neutralImage: Image | undefined
