import { describe, expect, it } from 'vitest'

import {
  Color,
  DirectionalLight3D,
  Environment3D,
  LightEnvironment,
  Node,
  Node3D,
  OmniLight3D,
  resolveEnvironment,
  SpotLight3D,
  Vector3,
} from '../../../source/index.js'

describe('Environment3D', () => {
  it('resolves the nearest environment for a node', () => {
    const resource = new LightEnvironment()
    const root = new Environment3D({ environment: resource })
    const group = new Node({ name: 'group' })
    const child = new Node3D()
    root.add(group)
    group.add(child)

    expect(resolveEnvironment(child)).toBe(resource)
    expect(resolveEnvironment(root)).toBe(resource)
    expect(resolveEnvironment(new Node3D())).toBeUndefined()
    root.destroy()
  })

  it('registers directional and punctual lights while loaded', () => {
    const environment = new Environment3D()
    const light = new DirectionalLight3D()
    const omni = new OmniLight3D({ position: new Vector3(1, 2, 3) })
    const spot = new SpotLight3D()
    environment.add(light)
    environment.add(omni)
    environment.add(spot)

    environment.load()

    expect(light.registered).toBe(true)
    expect(environment.environment.value.directional).toBeDefined()
    expect(environment.environment.value.punctual).toHaveLength(2)
    expect(environment.environment.value.punctual[0]?.position).toEqual(new Vector3(1, 2, 3))
    environment.destroy()
  })

  it('updates the snapshot when the light moves', () => {
    const environment = new Environment3D()
    const light = new OmniLight3D({ color: Color.white })
    environment.add(light)
    environment.load()

    light.position.value = new Vector3(5, 0, 0)

    expect(environment.environment.value.punctual[0]?.position).toEqual(new Vector3(5, 0, 0))
    environment.destroy()
  })

  it('removes the light from the environment when unloaded', () => {
    const environment = new Environment3D()
    const light = new OmniLight3D()
    environment.add(light)
    environment.load()

    light.unload()

    expect(light.registered).toBe(false)
    expect(environment.environment.value.punctual).toHaveLength(0)
    environment.destroy()
  })

  it('aims directional and spot lights along the node forward axis', () => {
    const environment = new Environment3D()
    const directional = new DirectionalLight3D({ rotation: new Vector3(0, Math.PI / 2, 0) })
    const spot = new SpotLight3D({ angle: Math.PI / 3 })
    environment.add(directional)
    environment.add(spot)
    environment.load()

    const light = environment.environment.value.directional
    expect(light?.direction.x).toBeCloseTo(-1)
    expect(environment.environment.value.punctual[0]?.coneCosine).toBeCloseTo(0.866, 3)
    environment.destroy()
  })

  it('validates light parameters', () => {
    expect(() => new OmniLight3D({ range: 0 })).toThrow('greater than zero')
    expect(() => new SpotLight3D({ angle: 4 })).toThrow('between zero and pi')
  })
})
