import { describe, expect, it } from 'vitest'

import { Color, Image, PbrAlphaMode, PbrMaterial } from '../../../source/index.js'

const pixels = new Uint8Array(2 * 2 * 4).fill(128)

function map(): Image {
  return new Image(2, 2, pixels.slice())
}

describe('PbrMaterial', () => {
  it('keeps the maps and the factors of the surface', () => {
    const baseColor = map()
    const normal = map()
    const material = new PbrMaterial({
      name: 'duck',
      baseColor: new Color(0.8, 0.6, 0.4, 1),
      baseColorMap: baseColor,
      metallic: 0.2,
      roughness: 0.7,
      normalMap: normal,
      normalScale: 0.5,
      alphaMode: PbrAlphaMode.mask,
      alphaCutoff: 0.3,
    })

    expect(material.name).toBe('duck')
    expect(material.baseColorMap).toBe(baseColor)
    expect(material.normalScale).toBe(0.5)
    expect(material.alphaMode).toBe(PbrAlphaMode.mask)
    expect(material.maps).toEqual([baseColor, normal])
    baseColor.destroy()
    normal.destroy()
  })

  it('builds a material that binds four samplers, one per map slot', () => {
    const material = new PbrMaterial({ baseColorMap: map() })

    const graphic = material.createMaterial()

    expect(graphic.textures).toHaveLength(4)
    expect(graphic.uniforms.get('uMetallic')).toBe(1)
    expect(graphic.uniforms.get('uAlphaCutoff')).toBe(0)
    graphic.destroy()
  })

  it('keeps the cutoff of a masked material and clears it otherwise', () => {
    const masked = new PbrMaterial({ alphaMode: PbrAlphaMode.mask, alphaCutoff: 0.4 })
    const opaque = new PbrMaterial({ alphaCutoff: 0.4 })

    expect(masked.createMaterial().uniforms.get('uAlphaCutoff')).toBe(0.4)
    expect(opaque.createMaterial().uniforms.get('uAlphaCutoff')).toBe(0)
  })

  it('rejects factors it cannot draw with', () => {
    expect(() => new PbrMaterial({ roughness: -1 })).toThrow(/roughness/)
    expect(() => new PbrMaterial({ exposure: Number.NaN })).toThrow(/exposure/)
  })
})
