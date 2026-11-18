import { describe, expect, it } from 'vitest'

import {
  InputAxis,
  KeyboardInputEvent,
  type KeyboardKey,
  OrbitCamera3D,
  Vector3,
} from '../../../../../source/index.js'

const context = { deltaTime: 0.5, updateRate: 60 }

function key(identifier: string, source: KeyboardKey): KeyboardInputEvent {
  return new KeyboardInputEvent({ identifier, source })
}

describe('OrbitCamera3D', () => {
  it('looks at its target from the distance it was given', () => {
    const camera = new OrbitCamera3D({
      target: new Vector3(0, 1, 0),
      distance: 10,
      yaw: 0,
      pitch: 0,
    })

    expect(camera.position.value.x).toBeCloseTo(0)
    expect(camera.position.value.y).toBeCloseTo(1)
    expect(camera.position.value.z).toBeCloseTo(10)
    camera.destroy()
  })

  it('turns with a pointer delta and keeps the pitch inside its limits', () => {
    const camera = new OrbitCamera3D({ sensitivity: 0.01 })

    camera.turn(100, 0)
    expect(camera.yaw.value).toBeCloseTo(-1)

    camera.turn(0, -10000)
    expect(camera.pitch.value).toBeCloseTo(1.5)
    camera.destroy()
  })

  it('zooms between the distances it allows', () => {
    const camera = new OrbitCamera3D({ distance: 10, minimumDistance: 4, maximumDistance: 20 })

    camera.zoom(-100)
    expect(camera.distance.value).toBe(4)

    camera.zoom(100)
    expect(camera.distance.value).toBe(20)
    camera.destroy()
  })

  it('turns and zooms with the axes it was given', () => {
    const left = key('left', 'ArrowLeft')
    const right = key('right', 'ArrowRight')
    const yaw = new InputAxis({ identifier: 'yaw', pairs: [{ negative: left, positive: right }] })
    const camera = new OrbitCamera3D({ yawAxis: yaw, distance: 10 })

    right.fire({ key: 'ArrowRight', down: true, repeat: false })
    camera.update(context)

    expect(camera.yaw.value).not.toBeCloseTo(0)
    expect(camera.position.value.z).not.toBeCloseTo(10)
    camera.destroy()
    yaw.destroy()
    left.destroy()
    right.destroy()
  })
})
