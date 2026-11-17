import { describe, expect, it } from 'vitest'

import { SpriteFrames, Vector2 } from '../../../../../../source/index.js'

const region = { min: new Vector2(0, 0), max: new Vector2(0.5, 1) }

describe('SpriteFrames', () => {
  it('stores normalized frames per animation', () => {
    const frames = new SpriteFrames()
    frames.add('walk', [{ region }, { region, duration: 0.2 }])

    expect(frames.has('walk')).toBe(true)
    expect(frames.animations).toEqual(['walk'])
    expect(frames.framesOf('walk')?.[0]?.duration).toBe(0.1)
    expect(frames.framesOf('walk')?.[1]?.duration).toBe(0.2)
    frames.destroy()
  })

  it('rejects empty animations, invalid regions and durations', () => {
    const frames = new SpriteFrames()

    expect(() => frames.add('', [{ region }])).toThrow('must not be empty')
    expect(() => frames.add('walk', [])).toThrow('at least one frame')
    expect(() => frames.add('walk', [{ region, duration: 0 }])).toThrow('greater than zero')
    expect(() =>
      frames.add('walk', [{ region: { min: new Vector2(0, 0), max: new Vector2(2, 1) } }]),
    ).toThrow('between zero and one')
    frames.destroy()
  })
})
