import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BlendMode,
  Bounds2,
  Camera2D,
  Camera3D,
  ClearCommand,
  Color,
  createBoxMesh,
  createSphereMesh,
  Draw2DCommand,
  Draw3DCommand,
  GraphicMaterial,
  GraphicMesh2D,
  GraphicVertex2D,
  Image,
  ImageTexture,
  LightEnvironment,
  LightKind,
  Matrix3x2,
  Matrix4x4,
  RasterImageFormat,
  RenderContext,
  RenderTarget,
  RenderTargetFormat,
  Shader,
  ShaderLanguage,
  ShaderStage,
  TextureBinding,
  TextureSampler,
  Vector2,
  Vector3,
  Viewport,
  WebGlBackend,
} from '../../../../../source/index.js'
import { createGlHarness, type GlHarness } from '../../../../gpu/webgl-harness.js'

function createMaterial(
  textures?: Iterable<TextureBinding>,
  blend: BlendMode = BlendMode.alpha,
): GraphicMaterial {
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
    ...(textures === undefined ? {} : { textures }),
    blend,
  })
}

function createMesh(x: number = 0): GraphicMesh2D {
  return new GraphicMesh2D([
    new GraphicVertex2D(new Vector2(x, 0), new Vector2(0, 0), Color.red),
    new GraphicVertex2D(new Vector2(x + 1, 0), new Vector2(1, 0), Color.green),
    new GraphicVertex2D(new Vector2(x, 1), new Vector2(0, 1), Color.blue),
  ])
}

function createCommand(material: GraphicMaterial, x: number = 0): Draw2DCommand {
  return new Draw2DCommand({ mesh: createMesh(x), material, transform: Matrix3x2.identity })
}

function createContext(): RenderContext {
  return new RenderContext(0, new Camera2D(), new Viewport(new Vector2(0, 0), new Vector2(100, 50)))
}

function create3DContext(): RenderContext {
  return new RenderContext(
    0,
    new Camera3D({ position: new Vector3(0, 0, 5) }),
    new Viewport(new Vector2(0, 0), new Vector2(100, 100)),
  )
}

describe('WebGlBackend', () => {
  beforeEach(() => {
    vi.stubGlobal('devicePixelRatio', 1)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function createBackend(options?: { antialias?: boolean; textureBudget?: number }): {
    backend: WebGlBackend
    harness: GlHarness
  } {
    const harness = createGlHarness()
    const backend = new WebGlBackend({ canvas: harness.canvas, ...options })

    return { backend, harness }
  }

  it('reports when a WebGL 2 context is unavailable', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement

    expect(() => new WebGlBackend({ canvas })).toThrow('WebGL 2 context is unavailable')
  })

  it('requests an antialiased context by default', () => {
    const harness = createGlHarness()
    new WebGlBackend({ canvas: harness.canvas })

    expect(harness.attributes?.antialias).toBe(true)
  })

  it('clears with the requested color and draws indexed geometry', () => {
    const { backend, harness } = createBackend()
    const material = createMaterial()

    backend.beginFrame()
    backend.render([new ClearCommand(new Color(1, 0, 0, 1))])
    backend.render([createCommand(material)], createContext())
    backend.endFrame()

    expect(harness.gl.callsTo('clearColor')[0]?.args).toEqual([1, 0, 0, 1])
    expect(harness.gl.callsTo('clear')).toHaveLength(1)
    expect(harness.gl.callsTo('bufferData').length).toBeGreaterThanOrEqual(2)
    expect(harness.drawCalls).toHaveLength(1)
    expect(harness.drawCalls[0]?.args).toEqual([
      harness.gl.TRIANGLES,
      3,
      harness.gl.UNSIGNED_INT,
      0,
    ])
    backend.destroy()
  })

  it('batches consecutive commands that share a material', () => {
    const { backend, harness } = createBackend()
    const material = createMaterial()

    backend.beginFrame()
    backend.render(
      [createCommand(material, 0), createCommand(material, 2), createCommand(material, 4)],
      createContext(),
    )
    backend.endFrame()

    expect(harness.drawCalls).toHaveLength(1)
    expect(harness.drawCalls[0]?.args[1]).toBe(9)
    expect(backend.stats).toEqual({
      drawCalls: 1,
      batches: 1,
      commands: 3,
      textures: 0,
      targets: 0,
      textureBytes: 0,
    })
    expect(
      harness.gl.callsTo('bufferData').some((call) => call.args[2] === harness.gl.DYNAMIC_DRAW),
    ).toBe(true)
    backend.destroy()
  })

  it('splits batches when the material changes', () => {
    const { backend, harness } = createBackend()
    const first = createMaterial()
    const second = createMaterial()

    backend.beginFrame()
    backend.render(
      [createCommand(first), createCommand(first), createCommand(second)],
      createContext(),
    )
    backend.endFrame()

    expect(harness.drawCalls).toHaveLength(2)
    backend.destroy()
  })

  it('applies the material blend mode', () => {
    const { backend, harness } = createBackend()
    const additive = createMaterial(undefined, BlendMode.additive)

    backend.beginFrame()
    backend.render([createCommand(additive)], createContext())
    backend.endFrame()

    expect(harness.gl.callsTo('blendFuncSeparate')[0]?.args).toEqual([
      harness.gl.SRC_ALPHA,
      harness.gl.ONE,
      harness.gl.ONE,
      harness.gl.ONE,
    ])
    backend.destroy()
  })

  it('uploads sRGB images with an sRGB internal format', () => {
    const { backend, harness } = createBackend()
    const image = new Image(1, 1, new Uint8Array([255, 255, 255, 255]), RasterImageFormat.rgba8Srgb)
    const material = createMaterial([
      new TextureBinding(new ImageTexture(image), new TextureSampler()),
    ])

    backend.beginFrame()
    backend.render([createCommand(material)], createContext())
    backend.endFrame()

    const upload = harness.gl.callsTo('texImage2D').find((call) => call.args[8] !== null)
    expect(upload?.args[2]).toBe(harness.gl.SRGB8_ALPHA8)
    backend.destroy()
    image.destroy()
  })

  it('generates mipmaps when the sampler requests them', () => {
    const { backend, harness } = createBackend()
    const image = new Image(2, 2, new Uint8Array(2 * 2 * 4))
    const material = createMaterial([
      new TextureBinding(new ImageTexture(image), new TextureSampler({ mipmaps: true })),
    ])

    backend.beginFrame()
    backend.render([createCommand(material)], createContext())
    backend.endFrame()

    expect(harness.gl.callsTo('generateMipmap')).toHaveLength(1)
    expect(
      harness.gl
        .callsTo('texParameteri')
        .some((call) => call.args[2] === harness.gl.LINEAR_MIPMAP_LINEAR),
    ).toBe(true)
    backend.destroy()
    image.destroy()
  })

  it('renders into offscreen targets and restores the window framebuffer', () => {
    const { backend, harness } = createBackend()
    const target = new RenderTarget(new Vector2(64, 32))
    const material = createMaterial()

    backend.beginFrame()
    backend.render([new ClearCommand(Color.black)], undefined, target)
    backend.render([createCommand(material)], createContext(), target)
    backend.endFrame()

    const framebufferCalls = harness.gl.callsTo('bindFramebuffer')
    expect(
      framebufferCalls.some(
        (call) => call.args[0] === harness.gl.FRAMEBUFFER && call.args[1] === null,
      ),
    ).toBe(true)
    expect(
      harness.gl.callsTo('viewport').some((call) => call.args[2] === 64 && call.args[3] === 32),
    ).toBe(true)
    backend.destroy()
    target.destroy()
  })

  it('invalidates cached programs when a material is destroyed', () => {
    const { backend, harness } = createBackend()
    const material = createMaterial()

    backend.beginFrame()
    backend.render([createCommand(material)], createContext())
    backend.endFrame()
    expect(harness.gl.callsTo('createProgram')).toHaveLength(1)

    material.destroy()
    expect(harness.gl.callsTo('deleteProgram').length).toBeGreaterThanOrEqual(1)

    const draws = harness.gl.callsTo('drawElements').length
    backend.beginFrame()
    backend.render([createCommand(material)], createContext())
    backend.endFrame()
    expect(harness.gl.callsTo('drawElements')).toHaveLength(draws)
    backend.destroy()
  })

  it('skips frames while the context is lost and recovers when restored', () => {
    const { backend, harness } = createBackend()
    const material = createMaterial()
    const lost = harness.listeners.get('webglcontextlost')
    const restored = harness.listeners.get('webglcontextrestored')

    lost?.({ preventDefault: () => undefined } as unknown as Event)
    expect(() => {
      backend.beginFrame()
      backend.render([createCommand(material)], createContext())
      backend.endFrame()
    }).not.toThrow()
    expect(harness.drawCalls).toHaveLength(0)
    expect(backend.stats.drawCalls).toBe(0)

    restored?.({} as Event)
    backend.beginFrame()
    backend.render([createCommand(material)], createContext())
    backend.endFrame()
    expect(harness.drawCalls).toHaveLength(1)
    backend.destroy()
  })

  it('uploads custom material uniforms', () => {
    const { backend, harness } = createBackend()
    const material = createMaterial()
    material.setUniform('uAccent', new Color(0.1, 0.2, 0.3, 0.4))
    material.setUniform('uScale', new Vector2(2, 3))
    material.setUniform('uTime', 0.5)
    material.setUniform('uFrame', Matrix4x4.identity)

    backend.beginFrame()
    backend.render([createCommand(material)], createContext())
    backend.endFrame()

    const names = (call: string): unknown[] =>
      harness.gl.callsTo(call).map((item) => (item.args[0] as { name: string }).name)
    expect(names('uniform4f')).toContain('uAccent')
    expect(names('uniform2f')).toContain('uScale')
    expect(names('uniform1f')).toContain('uTime')
    expect(names('uniformMatrix4fv')).toContain('uFrame')
    backend.destroy()
  })

  it('multisamples render targets and resolves them before sampling', () => {
    const { backend, harness } = createBackend()
    const target = new RenderTarget(new Vector2(64, 32))
    const sampler = new TextureSampler()
    const material = createMaterial([new TextureBinding(target, sampler)])

    backend.beginFrame()
    backend.render([createCommand(material)], createContext(), target)
    backend.render([createCommand(material)], createContext())
    backend.endFrame()

    expect(harness.gl.callsTo('renderbufferStorageMultisample')).toHaveLength(1)
    expect(harness.gl.callsTo('blitFramebuffer')).toHaveLength(1)
    backend.destroy()
    sampler.destroy()
    target.destroy()
  })

  it('skips multisampling when the target requests one sample', () => {
    const { backend, harness } = createBackend()
    const target = new RenderTarget(new Vector2(64, 32), { sampleCount: 1 })

    backend.beginFrame()
    backend.render([new ClearCommand(Color.black)], undefined, target)
    backend.endFrame()

    expect(harness.gl.callsTo('renderbufferStorageMultisample')).toHaveLength(0)
    expect(harness.gl.callsTo('blitFramebuffer')).toHaveLength(0)
    backend.destroy()
    target.destroy()
  })

  it('applies anisotropic filtering when the sampler requests it', () => {
    const { backend, harness } = createBackend()
    const image = new Image(2, 2, new Uint8Array(16))
    const sampler = new TextureSampler({ anisotropy: 8 })
    const texture = new ImageTexture(image)
    const material = createMaterial([new TextureBinding(texture, sampler)])

    backend.beginFrame()
    backend.render([createCommand(material)], createContext())
    backend.endFrame()

    const calls = harness.gl.callsTo('texParameterf')
    expect(calls).toHaveLength(1)
    expect(calls[0]?.args[1]).toBe(0x84fe)
    expect(calls[0]?.args[2]).toBe(8)
    backend.destroy()
    sampler.destroy()
    texture.destroy()
    image.destroy()
  })

  it('creates float render targets and multisamples them with the same format', () => {
    const { backend, harness } = createBackend()
    const target = new RenderTarget(new Vector2(64, 32), {
      format: RenderTargetFormat.rgba16f,
    })

    backend.beginFrame()
    backend.render([new ClearCommand(Color.black)], undefined, target)
    backend.endFrame()

    const texture = harness.gl
      .callsTo('texImage2D')
      .find((call) => call.args[2] === harness.gl.RGBA16F)
    expect(texture?.args[7]).toBe(harness.gl.HALF_FLOAT)
    const renderbuffer = harness.gl.callsTo('renderbufferStorageMultisample')
    expect(renderbuffer[0]?.args[2]).toBe(harness.gl.RGBA16F)
    backend.destroy()
    target.destroy()
  })

  it('generates mipmaps when a target requests them', () => {
    const { backend, harness } = createBackend()
    const target = new RenderTarget(new Vector2(64, 32), {
      sampleCount: 1,
      mipmaps: true,
    })
    const sampler = new TextureSampler({ mipmaps: true })
    const material = createMaterial([new TextureBinding(target, sampler)])

    backend.beginFrame()
    backend.render([new ClearCommand(Color.black)], undefined, target)
    backend.render([createCommand(material)], createContext())
    backend.endFrame()

    expect(harness.gl.callsTo('generateMipmap')).toHaveLength(1)
    backend.destroy()
    sampler.destroy()
    target.destroy()
  })

  it('evicts least recently used textures beyond the budget and releases them', () => {
    const { backend, harness } = createBackend({ textureBudget: 20 })
    const images = [new Image(2, 2, new Uint8Array(16)), new Image(2, 2, new Uint8Array(16))]
    const samplers = images.map(() => new TextureSampler())
    const textures = images.map((image) => new ImageTexture(image))
    const materials = textures.map((texture, index) =>
      createMaterial([new TextureBinding(texture, samplers[index] ?? new TextureSampler())]),
    )

    backend.beginFrame()
    for (const material of materials) {
      backend.render([createCommand(material)], createContext())
    }

    expect(backend.stats.textures).toBe(1)
    expect(backend.stats.textureBytes).toBe(16)
    expect(harness.gl.callsTo('deleteTexture').length).toBeGreaterThan(0)

    const firstMaterial = materials[0]
    if (firstMaterial !== undefined) {
      backend.render([createCommand(firstMaterial)], createContext())
    }

    backend.endFrame()

    backend.releaseTextures()
    expect(backend.stats.textures).toBe(0)
    expect(backend.stats.textureBytes).toBe(0)
    backend.destroy()
    for (const sampler of samplers) sampler.destroy()
    for (const texture of textures) texture.destroy()
    for (const image of images) image.destroy()
  })

  it('resolves a multisampled target once per frame', () => {
    const { backend, harness } = createBackend()
    const target = new RenderTarget(new Vector2(32, 16))
    const sampler = new TextureSampler()
    const material = createMaterial([new TextureBinding(target, sampler)])

    backend.beginFrame()
    backend.render([createCommand(material)], createContext(), target)
    backend.render([createCommand(material)], createContext())
    backend.render([createCommand(material)], createContext())
    backend.endFrame()

    expect(harness.gl.callsTo('blitFramebuffer')).toHaveLength(1)
    backend.destroy()
    sampler.destroy()
    target.destroy()
  })

  it('clamps the sample count to the device maximum', () => {
    const { backend, harness } = createBackend()
    const target = new RenderTarget(new Vector2(32, 16), { sampleCount: 16 })

    backend.beginFrame()
    backend.render([new ClearCommand(Color.black)], undefined, target)
    backend.endFrame()

    expect(harness.gl.callsTo('renderbufferStorageMultisample')[0]?.args[1]).toBe(8)
    backend.destroy()
    target.destroy()
  })

  it('rejects float targets without the color buffer extension', () => {
    const harness = createGlHarness()
    harness.gl.colorBufferFloat = false
    const backend = new WebGlBackend({ canvas: harness.canvas })
    const target = new RenderTarget(new Vector2(32, 16), {
      format: RenderTargetFormat.rgba16f,
    })

    expect(() => {
      backend.beginFrame()
      backend.render([new ClearCommand(Color.black)], undefined, target)
    }).toThrow('EXT_color_buffer_float')
    backend.endFrame()
    backend.destroy()
    target.destroy()
  })

  it('creates sRGB targets with an sRGB internal format', () => {
    const { backend, harness } = createBackend()
    const target = new RenderTarget(new Vector2(32, 16), {
      format: RenderTargetFormat.rgba8Srgb,
    })

    backend.beginFrame()
    backend.render([new ClearCommand(Color.black)], undefined, target)
    backend.endFrame()

    const texture = harness.gl
      .callsTo('texImage2D')
      .find((call) => call.args[2] === harness.gl.SRGB8_ALPHA8)
    expect(texture).toBeDefined()
    backend.destroy()
    target.destroy()
  })

  it('applies a space viewport with optional scissoring', () => {
    const { backend, harness } = createBackend()
    const material = createMaterial()
    const viewport = new Viewport(new Vector2(10, 5), new Vector2(50, 20), true)

    backend.beginFrame()
    backend.render([createCommand(material)], new RenderContext(0, new Camera2D(), viewport))
    backend.endFrame()

    expect(harness.gl.callsTo('viewport')[0]?.args).toEqual([10, 25, 50, 20])
    expect(harness.gl.callsTo('scissor')[0]?.args).toEqual([10, 25, 50, 20])
    expect(
      harness.gl.callsTo('enable').some((call) => call.args[0] === harness.gl.SCISSOR_TEST),
    ).toBe(true)
    backend.destroy()
  })

  it('reads pixels from the window ordered from top to bottom', () => {
    const { backend } = createBackend()
    const image = backend.readPixels()

    expect(image.width).toBe(100)
    expect(image.height).toBe(50)
    expect(image.data[0]).toBe(49)
    expect(image.data[100 * 4]).toBe(48)
    backend.destroy()
    image.destroy()
  })

  it('multiplies the vertex colors by the tint of the command', () => {
    const { backend, harness } = createBackend()
    const material = createMaterial()
    const command = new Draw2DCommand({
      mesh: createMesh(),
      material,
      transform: Matrix3x2.identity,
      tint: new Color(0.5, 0.5, 0.5, 0.5),
    })

    backend.beginFrame()
    backend.render([command], createContext())
    backend.endFrame()

    const uploads = harness.gl
      .callsTo('bufferData')
      .filter(
        (call) =>
          call.args[0] === harness.gl.ARRAY_BUFFER && call.args[2] === harness.gl.DYNAMIC_DRAW,
      )
    const data = uploads[0]?.args[1] as Float32Array | undefined
    expect(data?.[4]).toBeCloseTo(0.5)
    expect(data?.[13]).toBeCloseTo(0.5)
    expect(data?.[22]).toBeCloseTo(0.5)
    backend.destroy()
    material.destroy()
  })

  it('overrides the material blend mode per command', () => {
    const { backend, harness } = createBackend()
    const material = createMaterial()
    const command = new Draw2DCommand({
      mesh: createMesh(),
      material,
      transform: Matrix3x2.identity,
      blend: BlendMode.additive,
    })

    backend.beginFrame()
    backend.render([command], createContext())
    backend.endFrame()

    const blends = harness.gl.callsTo('blendFuncSeparate')
    expect(blends[0]?.args).toEqual([
      harness.gl.SRC_ALPHA,
      harness.gl.ONE,
      harness.gl.ONE,
      harness.gl.ONE,
    ])
    backend.destroy()
    material.destroy()
  })

  it('clips commands with the scissor rectangle of their clip bounds', () => {
    const { backend, harness } = createBackend()
    const material = createMaterial()
    const command = new Draw2DCommand({
      mesh: createMesh(),
      material,
      transform: Matrix3x2.identity,
      clip: new Bounds2(new Vector2(-10, -10), new Vector2(10, 10)),
    })

    backend.beginFrame()
    backend.render([command], createContext())
    backend.endFrame()

    expect(harness.gl.callsTo('scissor')).toHaveLength(1)
    expect(
      harness.gl.callsTo('enable').some((call) => call.args[0] === harness.gl.SCISSOR_TEST),
    ).toBe(true)
    expect(
      harness.gl.callsTo('disable').some((call) => call.args[0] === harness.gl.SCISSOR_TEST),
    ).toBe(true)
    backend.destroy()
    material.destroy()
  })

  it('releases the GPU copy of a destroyed mesh', () => {
    const { backend, harness } = createBackend()
    const material = createMaterial()
    const mesh = createMesh()

    backend.beginFrame()
    backend.render(
      [new Draw2DCommand({ mesh, material, transform: Matrix3x2.identity })],
      createContext(),
    )
    backend.endFrame()
    mesh.destroy()

    expect(harness.gl.callsTo('deleteVertexArray')).toHaveLength(1)
    const draws = harness.gl.callsTo('drawElements').length
    backend.beginFrame()
    backend.render(
      [new Draw2DCommand({ mesh, material, transform: Matrix3x2.identity })],
      createContext(),
    )
    backend.endFrame()
    expect(harness.gl.callsTo('drawElements')).toHaveLength(draws)
    backend.destroy()
    material.destroy()
  })

  it('attaches depth buffers to targets that request them', () => {
    const { backend, harness } = createBackend()
    const multisampled = new RenderTarget(new Vector2(32, 16), { depth: true })
    const plain = new RenderTarget(new Vector2(32, 16), { sampleCount: 1, depth: true })

    backend.beginFrame()
    backend.render([new ClearCommand(Color.black)], undefined, multisampled)
    backend.render([new ClearCommand(Color.black)], undefined, plain)
    backend.endFrame()

    const attachments = harness.gl
      .callsTo('framebufferRenderbuffer')
      .filter((call) => call.args[1] === harness.gl.DEPTH_ATTACHMENT)
    expect(attachments).toHaveLength(2)
    const depthStorage = harness.gl
      .callsTo('renderbufferStorageMultisample')
      .filter((call) => call.args[2] === harness.gl.DEPTH_COMPONENT24)
    expect(depthStorage).toHaveLength(1)
    expect(
      harness.gl
        .callsTo('renderbufferStorage')
        .filter((call) => call.args[1] === harness.gl.DEPTH_COMPONENT24),
    ).toHaveLength(1)
    backend.destroy()
    multisampled.destroy()
    plain.destroy()
  })

  it('uploads and draws three-dimensional meshes with depth testing', () => {
    const { backend, harness } = createBackend()
    const mesh = createBoxMesh()

    backend.beginFrame()
    backend.render(
      [
        new Draw3DCommand({
          mesh,
          material: backend.default3DMaterial,
          transform: Matrix4x4.identity,
        }),
      ],
      create3DContext(),
    )
    backend.endFrame()

    const pointers = harness.gl.callsTo('vertexAttribPointer')
    expect(pointers.map((call) => call.args.slice(0, 2))).toEqual([
      [0, 3],
      [1, 3],
      [2, 2],
    ])
    expect(
      harness.gl.callsTo('enable').some((call) => call.args[0] === harness.gl.DEPTH_TEST),
    ).toBe(true)
    expect(harness.gl.callsTo('enable').some((call) => call.args[0] === harness.gl.CULL_FACE)).toBe(
      true,
    )
    expect(harness.gl.callsTo('cullFace')[0]?.args[0]).toBe(harness.gl.BACK)
    expect(harness.gl.callsTo('depthFunc')[0]?.args[0]).toBe(harness.gl.LEQUAL)
    expect(harness.gl.callsTo('drawElements')).toHaveLength(1)
    expect(backend.stats.drawCalls).toBe(1)
    mesh.destroy()
    backend.destroy()
  })

  it('clears depth together with color', () => {
    const { backend, harness } = createBackend()

    backend.beginFrame()
    backend.render([new ClearCommand(Color.black)])
    backend.endFrame()

    const clears = harness.gl.callsTo('clear')
    expect(clears[0]?.args[0]).toBe(harness.gl.COLOR_BUFFER_BIT | harness.gl.DEPTH_BUFFER_BIT)
    backend.destroy()
  })

  it('uploads the lights of the command environment', () => {
    const { backend, harness } = createBackend()
    const mesh = createBoxMesh()
    const environment = new LightEnvironment({ ambient: new Color(0.2, 0.2, 0.3, 1) })
    environment.setDirectional({
      kind: LightKind.directional,
      color: new Color(1, 0.5, 0.25, 1),
      position: new Vector3(0, 0, 0),
      direction: new Vector3(0, -1, 0),
      range: 0,
      coneCosine: 0,
    })
    environment.addPunctual({
      kind: LightKind.omni,
      color: Color.white,
      position: new Vector3(1, 2, 3),
      direction: new Vector3(0, 0, -1),
      range: 8,
      coneCosine: 0,
    })

    backend.beginFrame()
    backend.render(
      [
        new Draw3DCommand({
          mesh,
          material: backend.default3DMaterial,
          transform: Matrix4x4.identity,
          environment,
        }),
      ],
      create3DContext(),
    )
    backend.endFrame()

    const counts = harness.gl.callsTo('uniform1i')
    expect(counts.map((call) => call.args[1])).toEqual([1])
    expect(harness.gl.callsTo('uniform3fv').length).toBeGreaterThanOrEqual(4)
    expect(harness.gl.callsTo('uniform1fv').length).toBeGreaterThanOrEqual(2)
    environment.destroy()
    mesh.destroy()
    backend.destroy()
  })

  it('disables depth writes for transparent commands', () => {
    const { backend, harness } = createBackend()
    const mesh = createBoxMesh()

    backend.beginFrame()
    backend.render(
      [
        new Draw3DCommand({
          mesh,
          material: backend.default3DMaterial,
          transform: Matrix4x4.identity,
          blend: BlendMode.alpha,
        }),
      ],
      create3DContext(),
    )
    backend.endFrame()

    expect(harness.gl.callsTo('depthMask').map((call) => call.args[0])).toContain(false)
    expect(harness.gl.callsTo('depthMask').map((call) => call.args[0])).toContain(true)
    mesh.destroy()
    backend.destroy()
  })

  it('releases the GPU copy of a destroyed three-dimensional mesh', () => {
    const { backend, harness } = createBackend()
    const mesh = createBoxMesh()

    backend.beginFrame()
    backend.render(
      [
        new Draw3DCommand({
          mesh,
          material: backend.default3DMaterial,
          transform: Matrix4x4.identity,
        }),
      ],
      create3DContext(),
    )
    backend.endFrame()
    mesh.destroy()

    expect(harness.gl.callsTo('deleteVertexArray')).toHaveLength(1)
    const draws = harness.gl.callsTo('drawElements').length
    backend.beginFrame()
    backend.render(
      [
        new Draw3DCommand({
          mesh,
          material: backend.default3DMaterial,
          transform: Matrix4x4.identity,
        }),
      ],
      create3DContext(),
    )
    backend.endFrame()
    expect(harness.gl.callsTo('drawElements')).toHaveLength(draws)
    backend.destroy()
  })

  it('restores the two-dimensional state after a three-dimensional block', () => {
    const { backend, harness } = createBackend()
    const mesh = createBoxMesh()
    const material = createMaterial()
    const context = create3DContext()

    backend.beginFrame()
    backend.render(
      [
        new Draw3DCommand({
          mesh,
          material: backend.default3DMaterial,
          transform: Matrix4x4.identity,
        }),
      ],
      context,
    )
    backend.render(
      [new Draw2DCommand({ mesh: createMesh(), material, transform: Matrix3x2.identity })],
      context,
    )
    backend.endFrame()

    const states = harness.gl.calls
      .filter((call) => call.name === 'disable' || call.name === 'enable')
      .map((call) => [call.name, call.args[0]])
    expect(states).toContainEqual(['enable', harness.gl.DEPTH_TEST])
    expect(states).toContainEqual(['disable', harness.gl.DEPTH_TEST])
    expect(states).toContainEqual(['disable', harness.gl.CULL_FACE])
    mesh.destroy()
    material.destroy()
    backend.destroy()
  })

  it('creates opaque three-dimensional materials that write depth', () => {
    const { backend, harness } = createBackend()
    const mesh = createBoxMesh()
    const near = new Draw3DCommand({
      mesh,
      material: backend.default3DMaterial,
      transform: Matrix4x4.translation(0, 0, 2),
    })
    const far = new Draw3DCommand({
      mesh,
      material: backend.default3DMaterial,
      transform: Matrix4x4.translation(0, 0, -2),
    })

    backend.beginFrame()
    backend.render([near, far], create3DContext())
    backend.endFrame()

    expect(backend.default3DMaterial.blend).toBe(BlendMode.opaque)
    expect(harness.gl.callsTo('depthMask').map((call) => call.args[0])).not.toContain(false)
    mesh.destroy()
    backend.destroy()
  })

  it('accepts a blend mode when creating three-dimensional materials', () => {
    const { backend } = createBackend()
    const material = backend.createMaterial3D(undefined, BlendMode.alpha)

    expect(material.blend).toBe(BlendMode.alpha)
    material.destroy()
    backend.destroy()
  })

  it('uploads every mesh inside its own vertex array', () => {
    const { backend, harness } = createBackend()
    const box = createBoxMesh()
    const sphere = createSphereMesh(0.5, 6, 8)
    const commands = [box, sphere].map(
      (mesh) =>
        new Draw3DCommand({
          mesh,
          material: backend.default3DMaterial,
          transform: Matrix4x4.identity,
        }),
    )

    for (let frame = 0; frame < 2; frame++) {
      backend.beginFrame()
      backend.render(commands, create3DContext())
      backend.endFrame()
    }

    let boundArrays = 0
    const outside = harness.gl.calls.filter((call) => {
      if (call.name === 'bindVertexArray') {
        boundArrays = call.args[0] === null ? 0 : boundArrays + 1
      }

      return (
        call.name === 'bindBuffer' &&
        call.args[0] === harness.gl.ELEMENT_ARRAY_BUFFER &&
        boundArrays === 0
      )
    })
    expect(outside).toHaveLength(0)
    box.destroy()
    sphere.destroy()
    backend.destroy()
  })

  it('keeps drawing the rest of the scene when a mesh is destroyed', () => {
    const { backend, harness } = createBackend()
    const dead = createBoxMesh()
    const alive = createBoxMesh()
    const commands = [dead, alive].map(
      (mesh) =>
        new Draw3DCommand({
          mesh,
          material: backend.default3DMaterial,
          transform: Matrix4x4.identity,
        }),
    )

    dead.destroy()
    backend.beginFrame()
    backend.render(commands, create3DContext())
    backend.endFrame()

    expect(harness.gl.callsTo('drawElements')).toHaveLength(1)
    expect(backend.stats.drawCalls).toBe(1)
    alive.destroy()
    backend.destroy()
  })

  it('skips commands whose textures were destroyed', () => {
    const { backend, harness } = createBackend()
    const image = new Image(2, 2, new Uint8Array(16))
    const texture = new ImageTexture(image)
    const material = createMaterial([new TextureBinding(texture, new TextureSampler())])
    const commands = [
      createCommand(material),
      new Draw2DCommand({
        mesh: createMesh(),
        material: createMaterial(),
        transform: Matrix3x2.identity,
      }),
    ]

    texture.destroy()
    backend.beginFrame()
    backend.render(commands, createContext())
    backend.endFrame()

    expect(harness.gl.callsTo('drawElements')).toHaveLength(1)
    image.destroy()
    material.destroy()
    backend.destroy()
  })
})
