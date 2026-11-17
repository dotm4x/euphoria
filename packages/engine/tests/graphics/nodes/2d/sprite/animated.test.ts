import { describe, expect, it, vi } from 'vitest'

import {
  AnimatedSpriteNode,
  type Draw2DCommand,
  SpriteFrames,
  Vector2,
} from '../../../../../source/index.js'
import { createContext, createMaterial } from '../harness.js'

function createFrames(): SpriteFrames {
  return new SpriteFrames().add('walk', [
    { region: { min: new Vector2(0, 0), max: new Vector2(0.5, 1) }, duration: 0.1 },
    { region: { min: new Vector2(0.5, 0), max: new Vector2(1, 1) }, duration: 0.1 },
  ])
}

describe('AnimatedSpriteNode', () => {
  it('advances frames with the elapsed time and loops', () => {
    const material = createMaterial()
    const frames = createFrames()
    const node = new AnimatedSpriteNode({ material, frames, animation: 'walk' })
    const first = node.draw(createContext()).commands[0] as Draw2DCommand

    node.update({ deltaTime: 0.1 })
    const second = node.draw(createContext()).commands[0] as Draw2DCommand
    node.update({ deltaTime: 0.1 })
    expect(node.frame).toBe(0)

    expect(second.mesh).not.toBe(first.mesh)
    node.destroy()
    frames.destroy()
    material.destroy()
  })

  it('stops on the last frame and notifies when not looping', () => {
    const material = createMaterial()
    const frames = createFrames()
    const node = new AnimatedSpriteNode({
      material,
      frames,
      looping: false,
    })
    const finished = vi.fn()
    node.onFinished.connect(finished)
    node.update({ deltaTime: 0.1 })
    node.update({ deltaTime: 0.2 })

    expect(node.playing).toBe(false)
    expect(node.frame).toBe(1)
    expect(finished).toHaveBeenCalledWith('walk')
    node.destroy()
    frames.destroy()
    material.destroy()
  })

  it('plays and restarts animations', () => {
    const material = createMaterial()
    const frames = createFrames()
    const node = new AnimatedSpriteNode({ material, frames, autoplaying: false })

    expect(node.playing).toBe(false)
    node.play()
    expect(node.playing).toBe(true)
    node.update({ deltaTime: 0.1 })
    node.play('walk', true)
    expect(node.frame).toBe(0)
    expect(() => {
      node.play('run')
    }).toThrow('does not exist')
    node.destroy()
    frames.destroy()
    material.destroy()
  })

  it('requires an existing animation', () => {
    const frames = new SpriteFrames()

    expect(() => new AnimatedSpriteNode({ frames })).toThrow('existing animation')
    frames.destroy()
  })
})
