import { describe, expect, it } from 'vitest'

import { panFor, planarDistance, spatialDistance, Vector3 } from '../../../source/index.js'

const origin = new Vector3(0, 0, 0)
const forward = new Vector3(0, 0, -1)
const up = new Vector3(0, 1, 0)

describe('spatial audio', () => {
  it('measures plane distance without the vertical axis', () => {
    expect(planarDistance(new Vector3(3, 4, 100), origin)).toBeCloseTo(5)
  })

  it('measures space distance with every axis', () => {
    expect(spatialDistance(new Vector3(3, 4, 12), origin)).toBeCloseTo(13)
  })

  it('pans a voice to the side the listener hears it from', () => {
    expect(panFor(new Vector3(5, 0, 0), origin, forward, up)).toBeCloseTo(1)
    expect(panFor(new Vector3(-5, 0, 0), origin, forward, up)).toBeCloseTo(-1)
  })

  it('centres a voice the listener is standing on', () => {
    expect(panFor(origin, origin, forward, up)).toBe(0)
  })
})
