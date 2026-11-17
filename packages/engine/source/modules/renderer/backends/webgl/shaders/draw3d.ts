import { BlendMode } from '#/graphics/resources/blend-mode.js'
import { GraphicMaterial } from '#/graphics/resources/material.js'
import { Shader, ShaderLanguage, ShaderStage } from '#/graphics/resources/shader.js'
import { type TextureBinding } from '#/graphics/resources/textures/binding.js'

const vertexSource = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aTextureCoordinate;

uniform mat4 uViewProjection;
uniform mat4 uTransform;

out vec3 vWorldNormal;
out vec3 vWorldPosition;
out vec2 vTextureCoordinate;

void main() {
  vec4 world = uTransform * vec4(aPosition, 1.0);
  vWorldPosition = world.xyz;
  vWorldNormal = mat3(uTransform) * aNormal;
  vTextureCoordinate = aTextureCoordinate;
  gl_Position = uViewProjection * world;
}
`

const fragmentSource = /* glsl */ `#version 300 es
precision highp float;

const int maximumLights = 8;

uniform sampler2D uTextures[4];
uniform vec4 uTint;
uniform vec3 uCameraPosition;
uniform vec3 uAmbientColor;
uniform vec3 uDirectionalColor;
uniform vec3 uDirectionalDirection;
uniform int uLightCount;
uniform vec3 uLightPositions[maximumLights];
uniform vec3 uLightColors[maximumLights];
uniform vec3 uLightDirections[maximumLights];
uniform float uLightRanges[maximumLights];
uniform float uLightCones[maximumLights];

in vec3 vWorldNormal;
in vec3 vWorldPosition;
in vec2 vTextureCoordinate;

out vec4 outColor;

void main() {
  vec3 albedo = texture(uTextures[0], vTextureCoordinate).rgb * uTint.rgb;
  float alpha = texture(uTextures[0], vTextureCoordinate).a * uTint.a;
  vec3 normal = normalize(vWorldNormal);
  vec3 lighting = uAmbientColor;
  vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
  vec3 directional = -uDirectionalDirection;
  lighting += uDirectionalColor * max(dot(normal, directional), 0.0);
  float specular = pow(max(dot(normal, normalize(directional + viewDirection)), 0.0), 24.0);
  lighting += uDirectionalColor * specular * 0.12;

  for (int index = 0; index < maximumLights; index++) {
    if (index >= uLightCount) break;

    vec3 toLight = uLightPositions[index] - vWorldPosition;
    float distance = length(toLight);
    vec3 direction = normalize(toLight);
    float range = uLightRanges[index];
    float attenuation = clamp(1.0 - distance / range, 0.0, 1.0);
    attenuation *= attenuation;

    float cone = 1.0;
    float coneCosine = uLightCones[index];
    if (coneCosine > -1.0) {
      float alignment = dot(normalize(-direction), uLightDirections[index]);
      cone = smoothstep(coneCosine, coneCosine + 0.05, alignment);
    }

    float lambert = max(dot(normal, direction), 0.0);
    lighting += uLightColors[index] * lambert * attenuation * cone;
  }

  outColor = vec4(albedo * lighting, alpha);
}
`

/**
 * Creates the default material of the three-dimensional pipeline.
 *
 * Shaders declare `uViewProjection`, `uTransform`, `uTextures` and the lighting
 * uniforms uploaded by the backend, and read position, normal and texture
 * coordinate from vertex locations 0, 1 and 2.
 *
 * The material is opaque by default so it writes to the depth buffer, which is
 * required for correct occlusion between meshes.
 *
 * @param textures - Texture bindings; the first one is used as albedo.
 * @param blend - Blend mode; defaults to opaque.
 * @returns A GLSL material for the standard three-dimensional pipeline.
 */
export function createDefault3DMaterial(
  textures?: Iterable<TextureBinding>,
  blend: BlendMode = BlendMode.opaque,
): GraphicMaterial {
  return new GraphicMaterial({
    blend,
    vertexShader: new Shader({
      code: vertexSource,
      language: ShaderLanguage.glsl,
      stage: ShaderStage.vertex,
      entryPoint: 'main',
      path: 'euphoria://renderer/draw-3d.vert.glsl',
    }),
    fragmentShader: new Shader({
      code: fragmentSource,
      language: ShaderLanguage.glsl,
      stage: ShaderStage.fragment,
      entryPoint: 'main',
      path: 'euphoria://renderer/draw-3d.frag.glsl',
    }),
    ...(textures === undefined ? {} : { textures }),
  })
}
