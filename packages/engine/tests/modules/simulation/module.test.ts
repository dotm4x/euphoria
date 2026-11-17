import { describe, expect, it } from 'vitest'

import {
  Dimension,
  Game,
  type Simulable2D,
  SimulationBackend2D,
  SimulationData2D,
  type SimulationFrame2D,
  SimulationModule,
  SimulationPriority,
  type SimulationResult2D,
  SimulationSpace2D,
  type SimulationStats,
} from '../../../source/index.js'

class TestGame extends Game {}

class RecordingBackend extends SimulationBackend2D {
  public override readonly dimension: Dimension = Dimension.twoDimensional
  public readonly events: string[] = []

  public constructor(identifier: string = 'backend') {
    super(identifier)
  }

  public get stats(): SimulationStats {
    return { bodies: 0, colliders: 0, steps: 0, contacts: 0 }
  }

  public sync(_frame: SimulationFrame2D): void {
    this.events.push('sync')
  }

  public advance(): void {
    this.events.push('advance')
  }

  public castRay(): undefined {
    return undefined
  }

  public read(): SimulationResult2D {
    this.events.push('read')
    return { states: [], contacts: [] }
  }
}

function createEntry(identifier: string, order: string[]): Simulable2D {
  return {
    identifier,
    simulate: () => {
      order.push(identifier)
      return new SimulationData2D([])
    },
  }
}

describe('SimulationModule', () => {
  it('steps spaces in priority order', () => {
    const order: string[] = []
    const backend = new RecordingBackend()
    const module = new SimulationModule({
      backends: [backend],
      spaces: [
        new SimulationSpace2D({
          identifier: 'last',
          priority: SimulationPriority.critical,
          entries: [createEntry('last', order)],
        }),
        new SimulationSpace2D({
          identifier: 'first',
          priority: SimulationPriority.low,
          entries: [createEntry('first', order)],
        }),
      ],
    })

    module.step(1 / 60)

    expect(order).toEqual(['first', 'last'])
    expect(backend.events).toEqual(['sync', 'advance', 'read', 'sync', 'advance', 'read'])
    module.destroy()
  })

  it('routes spaces to the backend that matches their dimension', () => {
    const backend = new RecordingBackend()
    const space = new SimulationSpace2D({ identifier: 'space' })
    const module = new SimulationModule({ backends: [backend], spaces: [space] })

    expect(module.backendFor(space.dimension)).toBe(backend)
    expect(module.backendFor(Dimension.threeDimensional)).toBeUndefined()
    module.destroy()
  })

  it('rejects stepping a space without a matching backend', () => {
    const module = new SimulationModule({
      spaces: [new SimulationSpace2D({ identifier: 'space' })],
    })

    expect(() => {
      module.step(1 / 60)
    }).toThrow(/dimension/)

    module.destroy()
  })

  it('registers and returns spaces and backends to their owner', () => {
    const backend = new RecordingBackend()
    const space = new SimulationSpace2D({ identifier: 'space' })
    const module = new SimulationModule()
    const game = new TestGame([module])
    game.start()

    module.addBackend(backend)
    module.addSpace(space)

    expect(module.backends.get('backend')).toBe(backend)
    expect(module.spaces.get('space')).toBe(space)
    expect(module.removeSpace('space')).toBe(space)
    expect(module.removeBackend('backend')).toBe(backend)
    space.destroy()
    backend.destroy()
    game.stop()
    game.destroy()
  })

  it('steps the registered spaces on update', () => {
    const backend = new RecordingBackend()
    const module = new SimulationModule({
      backends: [backend],
      spaces: [new SimulationSpace2D({ identifier: 'space' })],
    })

    module.update({ deltaTime: 1 / 60, updateRate: 60 })

    expect(backend.events).toEqual(['sync', 'advance', 'read'])
    module.destroy()
  })

  it('owns the spaces and backends it destroys', () => {
    const backend = new RecordingBackend()
    const space = new SimulationSpace2D({ identifier: 'space' })
    const module = new SimulationModule({ backends: [backend], spaces: [space] })
    const game = new TestGame([module])
    game.start()
    game.stop()

    game.destroy()

    expect(space.destroyed).toBe(true)
    expect(backend.destroyed).toBe(true)
  })
})
