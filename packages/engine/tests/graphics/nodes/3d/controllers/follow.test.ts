import { describe, expect, it } from 'vitest'

import { FollowCamera3D, Node3D, Vector3 } from '../../../../../source/index.js'

const context = { deltaTime: 1, updateRate: 60 }

describe('FollowCamera3D', () => {
  it('sits at the offset from its target', () => {
    const target = new Node3D({ position: new Vector3(2, 0, 0) })
    target.load()
    const camera = new FollowCamera3D({ target, offset: new Vector3(0, 3, 6) })

    expect(camera.position.value).toEqual(new Vector3(2, 3, 6))
    camera.destroy()
    target.destroy()
  })

  it('catches up with a moving target over time', () => {
    const target = new Node3D()
    target.load()
    const camera = new FollowCamera3D({ target, offset: new Vector3(0, 0, 10), smoothing: 0.5 })
    target.position.value = new Vector3(10, 0, 0)

    camera.update(context)

    const first = camera.position.value.x
    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThan(10)

    camera.update(context)
    expect(camera.position.value.x).toBeGreaterThan(first)
    camera.destroy()
    target.destroy()
  })

  it('follows exactly when no smoothing is asked for', () => {
    const target = new Node3D()
    target.load()
    const camera = new FollowCamera3D({ target, offset: new Vector3(0, 0, 5), smoothing: 0 })
    target.position.value = new Vector3(4, 0, 0)

    camera.update(context)

    expect(camera.position.value).toEqual(new Vector3(4, 0, 5))
    camera.destroy()
    target.destroy()
  })
})
