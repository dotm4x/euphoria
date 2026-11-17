import { describe, expect, it } from 'vitest'

import {
  Camera2D,
  Color,
  Draw2DCommand,
  type Drawable,
  DrawData,
  Game,
  GraphicMaterial,
  GraphicMesh2D,
  GraphicVertex2D,
  Matrix3x2,
  Node,
  Node2D,
  NodeRenderSpace,
  RenderContext,
  RenderSortMode,
  ScenesModule,
  Shader,
  ShaderLanguage,
  ShaderStage,
  Vector2,
  Viewport,
} from '../../../../source/index.js'

class TestGame extends Game {}

class DrawableNode extends Node2D implements Drawable {
  public readonly draws: string[]
  public readonly label: string

  public constructor(name: string, draws: string[]) {
    super({ name })
    this.label = name
    this.draws = draws
  }

  public draw(): DrawData {
    this.draws.push(this.label)

    return new DrawData([])
  }
}

class CommandNode extends Node2D implements Drawable {
  private readonly _commands: Draw2DCommand[]

  public constructor(name: string, commands: Draw2DCommand[]) {
    super({ name })
    this._commands = commands
  }

  public draw(): DrawData {
    return new DrawData(this._commands)
  }
}

function createMaterial(): GraphicMaterial {
  return new GraphicMaterial({
    vertexShader: new Shader({
      code: 'vertex',
      language: ShaderLanguage.glsl,
      stage: ShaderStage.vertex,
    }),
    fragmentShader: new Shader({
      code: 'fragment',
      language: ShaderLanguage.glsl,
      stage: ShaderStage.fragment,
    }),
  })
}

function createCommand(x: number, depth: number = 0): Draw2DCommand {
  const mesh = new GraphicMesh2D([
    new GraphicVertex2D(new Vector2(x - 1, -1), new Vector2(0, 0), Color.white),
    new GraphicVertex2D(new Vector2(x + 1, -1), new Vector2(1, 0), Color.white),
    new GraphicVertex2D(new Vector2(x, 1), new Vector2(0, 1), Color.white),
  ])

  return new Draw2DCommand({
    mesh,
    material: createMaterial(),
    transform: Matrix3x2.identity,
    depth,
  })
}

function createContext(): RenderContext {
  return new RenderContext(
    0.016,
    new Camera2D(),
    new Viewport(new Vector2(0, 0), new Vector2(10, 10)),
  )
}

describe('NodeRenderSpace', () => {
  it('collects drawable nodes in hierarchy order and skips invisible subtrees', () => {
    const draws: string[] = []
    const visible = new DrawableNode('visible', draws)
    const hidden = new DrawableNode('hidden', draws)
    hidden.visible.value = false
    const child = new DrawableNode('child', draws)
    visible.add(child)
    const root = new Node({ name: 'root', children: [visible, hidden] })
    const scenes = new ScenesModule({ initial: root })
    const space = new NodeRenderSpace({ identifier: 'nodes', camera: new Camera2D(), scenes })
    const game = new TestGame([scenes])

    game.start()
    space.collect(createContext())

    expect(draws).toEqual(['visible', 'child'])

    game.stop()
    game.destroy()
    space.destroy()
  })

  it('skips nodes that are not loaded or not drawable', () => {
    const draws: string[] = []
    const root = new Node({ name: 'root', children: [new Node({ name: 'plain' })] })
    const scenes = new ScenesModule({ initial: root })
    const space = new NodeRenderSpace({ identifier: 'nodes', camera: new Camera2D(), scenes })
    const drawable = new DrawableNode('late', draws)
    root.add(drawable)

    space.collect(createContext())
    expect(draws).toEqual([])

    space.destroy()
    scenes.destroy()
  })

  it('culls commands outside the camera view unless culling is disabled', () => {
    const inside = new CommandNode('inside', [createCommand(0)])
    const outside = new CommandNode('outside', [createCommand(5000)])
    const root = new Node({ name: 'root', children: [inside, outside] })
    const scenes = new ScenesModule({ initial: root })
    const culled = new NodeRenderSpace({ identifier: 'culled', camera: new Camera2D(), scenes })
    const complete = new NodeRenderSpace({
      identifier: 'complete',
      camera: new Camera2D(),
      scenes,
      cull: false,
    })
    root.load()

    expect(culled.collect(createContext())).toHaveLength(1)
    expect(complete.collect(createContext())).toHaveLength(2)

    culled.destroy()
    complete.destroy()
    scenes.destroy()
  })

  it('orders commands by depth when the space sorts by depth', () => {
    const near = new CommandNode('near', [createCommand(0, 1)])
    const far = new CommandNode('far', [createCommand(0, 3)])
    const root = new Node({ name: 'root', children: [near, far] })
    const scenes = new ScenesModule({ initial: root })
    const space = new NodeRenderSpace({
      identifier: 'nodes',
      camera: new Camera2D(),
      scenes,
      sort: RenderSortMode.depth,
    })
    root.load()

    const depths = (space.collect(createContext()) as Draw2DCommand[]).map(
      (command) => command.depth,
    )

    expect(depths).toEqual([3, 1])
    space.destroy()
    scenes.destroy()
  })
})
