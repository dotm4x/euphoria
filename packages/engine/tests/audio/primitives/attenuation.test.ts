import { describe, expect, it } from 'vitest'

import { Attenuation, AttenuationModel } from '../../../source/index.js'

describe('Attenuation', () => {
  it('keeps the gain at one up to the minimum distance', () => {
    const curve = new Attenuation({ minimumDistance: 2, maximumDistance: 10 })

    expect(curve.gainAt(0)).toBe(1)
    expect(curve.gainAt(2)).toBe(1)
  })

  it('falls silently beyond the maximum distance', () => {
    const curve = new Attenuation({ minimumDistance: 1, maximumDistance: 10 })

    expect(curve.gainAt(10)).toBe(0)
    expect(curve.gainAt(25)).toBe(0)
  })

  it('fades linearly between both distances', () => {
    const curve = new Attenuation({
      model: AttenuationModel.linear,
      minimumDistance: 1,
      maximumDistance: 5,
    })

    expect(curve.gainAt(3)).toBeCloseTo(0.5)
  })

  it('follows the inverse and the inverse square of the distance', () => {
    const inverse = new Attenuation({ minimumDistance: 2, maximumDistance: 100 })
    const exponential = new Attenuation({
      model: AttenuationModel.exponential,
      minimumDistance: 2,
      maximumDistance: 100,
    })

    expect(inverse.gainAt(4)).toBeCloseTo(0.5)
    expect(exponential.gainAt(4)).toBeCloseTo(0.25)
  })

  it('compares curves by value', () => {
    const curve = new Attenuation({ minimumDistance: 2, maximumDistance: 8 })

    expect(curve.equals(new Attenuation({ minimumDistance: 2, maximumDistance: 8 }))).toBe(true)
    expect(curve.equals(new Attenuation({ minimumDistance: 3, maximumDistance: 8 }))).toBe(false)
  })

  it('rejects distances that are not finite or are inverted', () => {
    expect(() => new Attenuation({ minimumDistance: 0 })).toThrow(/minimum distance/)
    expect(() => new Attenuation({ minimumDistance: 5, maximumDistance: 5 })).toThrow(
      /maximum distance/,
    )
    expect(() => new Attenuation({ maximumDistance: Number.POSITIVE_INFINITY })).toThrow(
      /maximum distance/,
    )
  })
})
