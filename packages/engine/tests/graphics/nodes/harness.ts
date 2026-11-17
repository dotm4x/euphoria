import {
  Camera2D,
  type DrawCommand,
  type DrawContext,
  type DrawSink,
  GraphicMaterial,
  RenderContext,
  type RenderTarget,
  Shader,
  ShaderLanguage,
  ShaderStage,
  Vector2,
  Viewport,
} from '../../../source/index.js'

/** Creates a material without backend-specific shaders. */
export function createMaterial(): GraphicMaterial {
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

/** Creates a drawing context with a default camera and viewport. */
export function createContext(sink?: DrawSink): DrawContext {
  return new RenderContext(
    0.016,
    new Camera2D(),
    new Viewport(new Vector2(0, 0), new Vector2(100, 50)),
    sink,
  )
}

/** A sink that records the commands rendered through it. */
export class RecordingSink implements DrawSink {
  /** Recorded render calls. */
  public readonly renders: { commands: DrawCommand[]; target: RenderTarget | undefined }[] = []

  /** @inheritDoc */
  public render(
    commands: Iterable<DrawCommand>,
    _context?: DrawContext,
    target?: RenderTarget,
  ): void {
    this.renders.push({ commands: [...commands], target })
  }
}
