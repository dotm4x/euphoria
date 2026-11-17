import {
  type Camera,
  Camera2D,
  type GraphicMaterial,
  type Node as SceneNode,
  ScenesModule,
  Store,
} from '@euphoria/engine'

import { MyInputModule } from '../input/module.js'

import { type BallsMode, BallsScene } from './bench/scene.js'
import { CubeScene } from './cube.js'
import { MainScene } from './main.js'
import { SnakeScene } from './snake/scene.js'

export class MyScenesModule extends ScenesModule {
  public readonly camera: Store<Camera>
  public readonly main: MainScene
  public readonly snake: SnakeScene
  public readonly balls: BallsScene
  public readonly cube: CubeScene

  public constructor(
    material: GraphicMaterial,
    snakeMaterial: GraphicMaterial,
    material3D: GraphicMaterial,
  ) {
    const camera = new Camera2D({ name: 'camera' })
    const main = new MainScene(material, camera)
    const snake = new SnakeScene(snakeMaterial, camera)
    const params = new URLSearchParams(globalThis.location.search)
    const requested = params.get('scene')
    const mode: BallsMode = params.get('mode') === 'nodes' ? 'nodes' : 'single'
    const requestedCount = Number(params.get('count') ?? 1000)
    const count = Number.isFinite(requestedCount)
      ? Math.min(100000, Math.max(1, Math.floor(requestedCount)))
      : 1000
    const balls = new BallsScene(snakeMaterial, camera, mode, count)
    const cube = new CubeScene(material3D)
    let initial: SceneNode = main
    if (requested === 'snake') initial = snake
    else if (requested === 'balls') initial = balls
    else if (requested === 'cube') initial = cube
    super({ initial, dependencies: [{ type: MyInputModule }] })
    this.camera = new Store<Camera>(initial === cube ? cube.camera : camera)
    this.main = main
    this.snake = snake
    this.balls = balls
    this.cube = cube
  }

  protected override onDestroy(): void {
    super.onDestroy()
    if (!this.camera.destroyed) this.camera.destroy()
  }
}
