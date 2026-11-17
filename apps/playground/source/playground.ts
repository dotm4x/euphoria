import {
  type AssetsModule,
  Dimension,
  Game,
  type GraphicMaterial,
  type Module,
  type RenderBackend,
  SceneSimulationSpace2D,
  SceneSimulationSpace3D,
  type SimulationBackend,
  SimulationModule,
  type SimulationSpace,
  SimulationSpace2D,
  type Updatable,
  type UpdateContext,
} from '@euphoria/engine'

import { MyInputModule } from './input/module.js'
import { MyRendererModule } from './renderer/module.js'
import { MyScenesModule } from './scenes/module.js'
import { MyTimeModule } from './time/module.js'

export class Playground extends Game implements Updatable {
  public time: MyTimeModule
  public scenes: MyScenesModule
  public input: MyInputModule
  public renderer: MyRendererModule
  public assets: AssetsModule
  public simulation: SimulationModule
  public frames: number = 0

  public constructor(
    backend: RenderBackend,
    material: GraphicMaterial,
    assets: AssetsModule,
    physics: SimulationBackend[],
  ) {
    super()
    this.scenes = new MyScenesModule(material, backend.defaultMaterial, backend.default3DMaterial)
    const spaces = createSpaces(this.scenes, physics)
    this.simulation = new SimulationModule({ backends: physics, spaces })
    const space = spaces.find((candidate) => candidate instanceof SimulationSpace2D)
    if (space instanceof SimulationSpace2D) this.scenes.physics.attach(space)
    this.time = new MyTimeModule(this, this.scenes, this.simulation)
    this.input = new MyInputModule({ target: document.body })
    this.renderer = new MyRendererModule(backend, this.scenes)
    this.assets = assets
  }

  public update(context: UpdateContext): void {
    this.renderer.update(context)
    this.frames++
    const updates = document.querySelector('#updates')
    if (updates !== null) updates.textContent = String(this.frames)
    const delta = document.querySelector('#delta')
    if (delta !== null) delta.textContent = context.deltaTime.toFixed(3)
    const draws = document.querySelector('#draws')
    if (draws !== null) draws.textContent = String(this.renderer.backend.stats.drawCalls)
    const commands = document.querySelector('#commands')
    if (commands !== null) commands.textContent = String(this.renderer.backend.stats.commands)
    const hits = document.querySelector('#hits')
    if (hits !== null) hits.textContent = String(this.scenes.physics.hits)
  }

  protected override *compose(): Generator<Module> {
    yield this.time
    yield this.scenes
    yield this.input
    yield this.simulation
    yield this.renderer
    yield this.assets
  }
}

function createSpaces(scenes: MyScenesModule, backends: SimulationBackend[]): SimulationSpace[] {
  const spaces: SimulationSpace[] = []
  for (const backend of backends) {
    if (backend.dimension === Dimension.twoDimensional) {
      spaces.push(
        new SceneSimulationSpace2D({
          identifier: 'scene-2d',
          scenes,
          joints: scenes.physics.joints,
        }),
      )
      continue
    }

    spaces.push(
      new SceneSimulationSpace3D({
        identifier: 'scene-3d',
        scenes,
        joints: scenes.physics3d.joints,
      }),
    )
  }

  return spaces
}
