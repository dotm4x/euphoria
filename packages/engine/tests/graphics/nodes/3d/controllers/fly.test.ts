import { describe, expect, it } from 'vitest'

import {
  FlyCamera3D,
  InputAction,
  InputAxis,
  KeyboardInputEvent,
  type KeyboardKey,
} from '../../../../../source/index.js'

const context = { deltaTime: 1, updateRate: 60 }

function key(identifier: string, source: KeyboardKey): KeyboardInputEvent {
  return new KeyboardInputEvent({ identifier, source })
}

describe('FlyCamera3D', () => {
  it('moves along the view direction with the forward axis', () => {
    const back = key('back', 'KeyS')
    const forward = key('forward', 'KeyW')
    const axis = new InputAxis({
      identifier: 'forward',
      pairs: [{ negative: back, positive: forward }],
    })
    const camera = new FlyCamera3D({ forwardAxis: axis, speed: 5 })

    forward.fire({ key: 'KeyW', down: true, repeat: false })
    camera.update(context)

    expect(camera.position.value.z).toBeCloseTo(-5)
    camera.destroy()
    axis.destroy()
    back.destroy()
    forward.destroy()
  })

  it('turns in place without tilting the horizon', () => {
    const camera = new FlyCamera3D({ sensitivity: 0.01 })

    camera.turn(100, 100)

    expect(camera.rotation.value.z).toBeCloseTo(0)
    expect(camera.rotation.value.y).toBeCloseTo(-1)
    expect(camera.rotation.value.x).toBeCloseTo(-1)
    camera.destroy()
  })

  it('never looks past straight up or straight down', () => {
    const camera = new FlyCamera3D({ sensitivity: 0.01 })

    camera.turn(0, 10000)
    expect(camera.rotation.value.x).toBeCloseTo(-1.5)

    camera.turn(0, -10000)
    expect(camera.rotation.value.x).toBeCloseTo(1.5)
    camera.destroy()
  })

  it('moves three times as far while the boost action is held', () => {
    const forward = key('forward', 'KeyW')
    const back = key('back', 'KeyS')
    const axis = new InputAxis({
      identifier: 'forward',
      pairs: [{ negative: back, positive: forward }],
    })
    const boost = new InputAction({ identifier: 'boost' })
    const jump = key('jump', 'Space')
    const camera = new FlyCamera3D({ forwardAxis: axis, speed: 1, boost })

    forward.fire({ key: 'KeyW', down: true, repeat: false })
    camera.update(context)
    const normal = Math.abs(camera.position.value.z)

    boost.bind({ kind: 'key', event: jump })
    jump.fire({ key: 'Space', down: true, repeat: false })
    camera.update(context)
    const boosted = Math.abs(camera.position.value.z) - normal

    expect(boosted).toBeCloseTo(normal * 3)
    camera.destroy()
    axis.destroy()
    boost.destroy()
    back.destroy()
    forward.destroy()
    jump.destroy()
  })
})
