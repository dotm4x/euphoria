# @euphoria/engine

Two-dimensional game engine for the web, written in TypeScript.

The engine organizes behavior in a tree of nodes and a small set of modules, in
the spirit of Godot's `CanvasItem` hierarchy: visual nodes own their material,
tint, order and transforms, so scenes are built by composing nodes instead of
issuing drawing calls. Rendering runs on WebGL 2 and the same code path works in
the browser and in tests.

> [!WARNING]
> The engine is under active development. Its APIs change between commits and
> not every feature described here is stable. See the [project README](../../README.md)
> for the state of the platform around it.

## Requirements

- Node.js 22 or newer and pnpm 12 to build and test the package.
- A browser with WebGL 2 to run the rendering backend.

## Usage

The package is not published yet: it is consumed through the workspace, as the
[sandbox](../../sandbox) does.

```json
{
  "dependencies": {
    "@euphoria/engine": "workspace:*"
  }
}
```

## Quick start

```ts
import {
  Camera2D,
  Channel,
  ChannelPriority,
  Game,
  type GraphicMaterial,
  type Module,
  Node2D,
  NodeRenderSpace,
  RectNode,
  RendererModule,
  ScenesModule,
  SpriteNode,
  TimeModule,
  Vector2,
  WebGlBackend,
} from '@euphoria/engine'

class DemoScene extends Node2D {
  public constructor(material: GraphicMaterial) {
    super({
      name: 'demo',
      children: [
        new RectNode({ material, size: new Vector2(120, 80) }),
        new SpriteNode({
          material,
          size: new Vector2(64, 64),
          position: new Vector2(120, 0),
          region: { min: new Vector2(0, 0), max: new Vector2(0.5, 1) },
        }),
      ],
    })
  }
}

class Demo extends Game {
  public readonly time: TimeModule
  public readonly scenes: ScenesModule
  public readonly renderer: RendererModule

  public constructor(canvas: HTMLCanvasElement) {
    super()
    const backend = new WebGlBackend({ canvas })
    const camera = new Camera2D({ name: 'camera' })
    const scene = new DemoScene(backend.defaultMaterial)
    this.scenes = new ScenesModule({ initial: scene })
    this.renderer = new RendererModule({
      backend,
      spaces: [new NodeRenderSpace({ identifier: 'screen', camera, scenes: this.scenes })],
    })
    this.time = new TimeModule({
      channels: [
        new Channel({
          identifier: 'render',
          priority: ChannelPriority.normal,
          entries: [this.renderer],
        }),
      ],
    })
  }

  protected override *compose(): Generator<Module> {
    yield this.time
    yield this.scenes
    yield this.renderer
  }
}

const canvas = document.querySelector('canvas')
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing canvas')

const game = new Demo(canvas)
game.start()
game.time.run()
```

Modules transfer ownership to the game when it composes them, so `game.destroy()`
stops the loop and destroys the backend, the spaces and the scenes.

## Core concepts

### Game and modules

`Game` coordinates its modules in dependency order and exposes an observable
state (`idle`, `starting`, `running`, `stopping`, `failed`). A module declares
the modules it needs, and the game resolves them before starting.

| Module           | Responsibility                                                                         |
| ---------------- | -------------------------------------------------------------------------------------- |
| `TimeModule`     | Animation-frame loop with prioritized channels and fixed update rates                  |
| `ScenesModule`   | Owns scenes, loads and unloads them, and switches the active one                       |
| `RendererModule` | Executes render passes and spaces over a backend                                       |
| `AssetsModule`   | Loads, caches, reloads and releases assets through importers, with optional hot reload |
| `InputModule`    | Keyboard and mouse devices that fire typed, rebindable actions                         |
| `LoggerModule`   | Structured logging with pluggable outputs                                              |

### Node tree

`Node` provides naming, parenthood, visibility, tags and load/unload lifecycle.
`Node2D` adds `origin`, `position`, `rotation` and `scale`, with world-space
accessors. Modules can be required from a node, which is how scenes reach input
or other services.

## Rendering

### Backend

`WebGlBackend` implements `RenderBackend`:

- Batches consecutive commands that share material and blend mode into a single
  draw call, transforming vertices on the CPU.
- Culls commands against the camera view when the space enables it.
- Uploads textures with mipmaps, anisotropic filtering, sRGB and a
  least-recently-used VRAM budget, releasing them when their resources die.
- Supports multisampled render targets, resolved once per frame, plus float and
  sRGB target formats.
- Reports `drawCalls`, `batches`, `commands`, `textures`, `targets` and
  `textureBytes` through `stats`.
- Skips frames while the WebGL context is lost and recovers caches when restored.

`backend.createMaterial(...)` builds the standard material, and
`backend.defaultMaterial` is a ready-to-use instance owned by the backend.

### Spaces and passes

A `RenderSpace` groups drawable entries with a camera, priority, optional
offscreen target, culling and sorting mode. `NodeRenderSpace` collects the
commands of the active scene instead of a fixed entry list.

Each frame, `RendererModule` executes passes in priority order:

1. `ClearRenderPass` clears the window and every target once.
2. `SpaceRenderPass` draws the spaces, sorted by priority.
3. Custom `RenderPass` instances added through `passes` or `addPass`, which can
   post-process, composite or draw overlays.

### Visual nodes

All visual nodes extend `CanvasItem2D`. They inherit the material and `modulate`
of their nearest canvas ancestor and contribute `selfModulate`, `order`, `depth`,
`blend` and horizontal/vertical flips, so a group can style its whole subtree
without breaking batching.

| Node                 | Purpose                                                         |
| -------------------- | --------------------------------------------------------------- |
| `GroupNode`          | Groups nodes and shares material and tint                       |
| `YSortNode`          | Draws children from the lowest to the highest position          |
| `ClipNode`           | Clips the subtree to a rectangle                                |
| `ParallaxNode`       | Scrolls the subtree at a different speed than the camera        |
| `ViewportNode`       | Renders its children to a target and draws the result           |
| `RectNode`           | Solid or textured rectangle                                     |
| `MeshNode`           | Draws a custom `GraphicMesh2D`                                  |
| `PolygonNode`        | Triangulates a polygon as a fan                                 |
| `LineNode`           | Thick polyline with joins                                       |
| `NinePatchNode`      | Nine-slice panel from an atlas region                           |
| `SpriteNode`         | Textured quad with an atlas region, mutable size, tint and flip |
| `AnimatedSpriteNode` | Plays named animations stored in `SpriteFrames`                 |
| `TilemapNode`        | Grid of atlas tiles with view culling                           |
| `ParticlesNode`      | CPU particle pool with fading color and size                    |
| `TrailNode`          | Fading trail that follows a node                                |
| `MultiMeshNode`      | Many instances of one mesh, with an active count                |
| `Camera2D`           | Orthographic camera used by the spaces                          |

### Resources

`GraphicMaterial` combines shaders, texture bindings, a blend mode and custom
uniforms (`number`, `Color`, `Vector2`–`Vector4` or `Matrix4x4`). `Texture`,
`RenderTarget`, `Image` and `GraphicMesh2D` are resources: backends subscribe to
their destruction to release the native copies.

Images are decoded to `rgba8` or `rgba8-srgb` and can be sampled with mipmaps and
anisotropy. Render targets support `rgba8`, `rgba8Srgb` and `rgba16f`, with an
optional sample count and mipmaps.

## Assets

`AssetsModule` loads through importers selected by file extension:

- `JsonImporter`, `TextImporter` and `BinaryImporter`.
- `ImageImporter`, which decodes to an `Image` resource.
- `AudioImporter`, which decodes to an `AudioBuffer`.
- `ShaderImporter`, which builds a `ShaderSource` from `.glsl` or `.wgsl`.

Loaded assets are cached and can be reloaded or released. `SourceWatcher` can
feed hot reloads during development.

## Input

`InputModule` owns devices bound to one element. `Keyboard` and `Mouse` expose
`InputEvent` actions whose source can be rebound at runtime, and whose signals
deliver typed payloads with the browser event data.

## Math and geometry

`Vector2`, `Vector3`, `Vector4`, `Matrix2x2`, `Matrix3x2`, `Matrix3x3` and
`Matrix4x4` follow row-vector conventions: `point.multiply(matrix)` applies the
matrix to the point, and `a.multiply(b)` applies `a` before `b`. `Bounds2`,
`Mesh2D`, `Mesh` and `GraphicMesh2D` provide geometry with frozen data and
bounds for culling.

## Development

```sh
pnpm --filter @euphoria/engine build
pnpm --filter @euphoria/engine typecheck
pnpm --filter @euphoria/engine test
```

Tests use Vitest and run without a GPU: the rendering backend is exercised
through a recording WebGL 2 harness. End-to-end rendering is covered by the
Playwright pixel tests of the sandbox:

```sh
pnpm --filter @euphoria/sandbox test:gpu
```

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the workspace conventions.

## Structure

```
source/
  core/       game, modules, nodes, events and collections
  math/       vectors, matrices, meshes and Node2D
  graphics/   commands, resources, importers and visual nodes
  modules/    assets, input, logger, renderer, scenes and time
tests/        Vitest suites mirroring source/
```

## License

Licensed under the [Apache License 2.0](../../LICENSE).
