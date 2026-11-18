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
  SimulationSpace3D,
  type SimulationSpaceBinding,
  type SimulationStats,
} from '../../../source/index.js'

class TestGame extends Game {}

class ComposingModule extends SimulationModule {
  public configured: boolean = false

  protected override *compose(): Generator<SimulationSpaceBinding, void, unknown> {
    yield {
      space: new SimulationSpace2D({ identifier: 'composed' }),
      backend: new RecordingBackend('composed-backend'),
    }
  }

  protected override configure(): void {
    this.configured = true
  }
}

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
      spaces: [
        {
          space: new SimulationSpace2D({
            identifier: 'last',
            priority: SimulationPriority.critical,
            entries: [createEntry('last', order)],
          }),
          backend,
        },
        {
          space: new SimulationSpace2D({
            identifier: 'first',
            priority: SimulationPriority.low,
            entries: [createEntry('first', order)],
          }),
          backend,
        },
      ],
    })

    module.step(1 / 60)

    expect(order).toEqual(['first', 'last'])
    expect(backend.events).toEqual(['sync', 'advance', 'read', 'sync', 'advance', 'read'])
    module.destroy()
  })

  it('binds every space to its own backend', () => {
    const planar = new RecordingBackend('planar')
    const other = new RecordingBackend('other')
    const space = new SimulationSpace2D({ identifier: 'space' })
    const second = new SimulationSpace2D({ identifier: 'second' })
    const module = new SimulationModule({
      spaces: [
        { space, backend: planar },
        { space: second, backend: other },
      ],
    })

    module.step(1 / 60)

    expect(module.backendOf('space')).toBe(planar)
    expect(module.backendOf('second')).toBe(other)
    // Two spaces of the same dimension no longer share a world.
    expect(planar.events).toHaveLength(3)
    expect(other.events).toHaveLength(3)
    module.destroy()
  })

  it('rejects a space bound to a backend of another dimensionality', () => {
    const backend = new RecordingBackend()

    expect(
      () =>
        new SimulationModule({
          spaces: [{ space: new SimulationSpace3D({ identifier: 'spatial' }), backend }],
        }),
    ).toThrow(/dimensionality/)
  })

  it('registers and returns spaces and backends to their owner', () => {
    const backend = new RecordingBackend()
    const space = new SimulationSpace2D({ identifier: 'space' })
    const module = new SimulationModule()
    const game = new TestGame([module])
    game.start()

    module.addSpace({ space, backend })

    expect(module.backends.get('backend')).toBe(backend)
    expect(module.spaces.get('space')).toBe(space)
    expect(module.backendOf('space')).toBe(backend)
    expect(module.removeSpace('space')).toBe(space)
    expect(module.backendOf('space')).toBeUndefined()
    expect(module.removeBackend('backend')).toBe(backend)
    space.destroy()
    backend.destroy()
    game.stop()
    game.destroy()
  })

  it('steps the registered spaces on update', () => {
    const backend = new RecordingBackend()
    const module = new SimulationModule({
      spaces: [{ space: new SimulationSpace2D({ identifier: 'space' }), backend }],
    })

    module.update({ deltaTime: 1 / 60, updateRate: 60 })

    expect(backend.events).toEqual(['sync', 'advance', 'read'])
    module.destroy()
  })

  it('owns the spaces and backends it destroys', () => {
    const backend = new RecordingBackend()
    const space = new SimulationSpace2D({ identifier: 'space' })
    const module = new SimulationModule({ spaces: [{ space, backend }] })
    const game = new TestGame([module])
    game.start()
    game.stop()

    game.destroy()

    expect(space.destroyed).toBe(true)
    expect(backend.destroyed).toBe(true)
  })

  it('registers the spaces it composes when it starts', () => {
    const module = new ComposingModule()
    const game = new TestGame([module])

    game.start()

    const composed = module.spaces.get('composed')
    expect(composed).toBeInstanceOf(SimulationSpace2D)
    expect(module.configured).toBe(true)
    const backend = module.backendOf('composed')
    expect(backend?.identifier).toBe('composed-backend')
    game.stop()
    game.destroy()
    expect(composed?.destroyed).toBe(true)
    expect(backend?.destroyed).toBe(true)
  })
})
