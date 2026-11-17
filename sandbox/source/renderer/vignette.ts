import {
  type GraphicMaterial,
  GraphicMaterial as GraphicMaterialClass,
  type RenderTarget,
  Shader,
  ShaderLanguage,
  ShaderStage,
  TextureBinding,
  TextureSampler,
} from '@euphoria/engine'

const vertexSource = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aTextureCoordinate;
layout(location = 2) in vec4 aColor;

uniform mat4 uViewProjection;
uniform mat4 uTransform;

out vec2 vTextureCoordinate;
out vec4 vColor;

void main() {
  gl_Position = uViewProjection * uTransform * vec4(aPosition, 0.0, 1.0);
  vTextureCoordinate = aTextureCoordinate;
  vColor = aColor;
}
`

const fragmentSource = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D uTextures[4];
uniform float uStrength;

in vec2 vTextureCoordinate;
in vec4 vColor;

out vec4 outColor;

void main() {
  vec4 color = texture(uTextures[0], vTextureCoordinate) * vColor;
  vec2 centered = vTextureCoordinate - vec2(0.5);
  float vignette = clamp(1.0 - uStrength * dot(centered, centered), 0.0, 1.0);
  outColor = vec4(color.rgb * vignette, color.a);
}
`

/**
 * Creates the material that draws a viewport target with a vignette.
 *
 * @param target - Offscreen target sampled by the material.
 * @returns A material that darkens the corners of its texture.
 */
export function createVignetteMaterial(target: RenderTarget): GraphicMaterial {
  return new GraphicMaterialClass({
    vertexShader: new Shader({
      code: vertexSource,
      language: ShaderLanguage.glsl,
      stage: ShaderStage.vertex,
    }),
    fragmentShader: new Shader({
      code: fragmentSource,
      language: ShaderLanguage.glsl,
      stage: ShaderStage.fragment,
    }),
    textures: [new TextureBinding(target, new TextureSampler())],
    uniforms: [['uStrength', 1.1]],
  })
}
