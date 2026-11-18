import { Color } from '../primitives/color.js'

import { type BlendMode } from './blend-mode.js'
import { GraphicMaterial } from './material.js'
import { Shader, ShaderLanguage, ShaderStage } from './shader.js'
import { type TextureBinding } from './textures/binding.js'

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
const float pi = 3.14159265359;

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

uniform vec4 uBaseColorFactor;
uniform float uMetallic;
uniform float uRoughness;
uniform vec4 uEmissiveFactor;
uniform float uNormalScale;
uniform float uOcclusionStrength;
uniform float uAlphaCutoff;
uniform float uExposure;
uniform float uMetallicRoughnessMap;
uniform float uNormalMap;
uniform float uEmissiveMap;

in vec3 vWorldNormal;
in vec3 vWorldPosition;
in vec2 vTextureCoordinate;
out vec4 outColor;

vec3 aces(vec3 color) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
}

float distribution(float roughness, float nDotH) {
  float a = roughness * roughness;
  float a2 = a * a;
  float d = nDotH * nDotH * (a2 - 1.0) + 1.0;

  return a2 / max(pi * d * d, 1e-6);
}

float geometry(float roughness, float nDotV, float nDotL) {
  float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
  return (nDotV / (nDotV * (1.0 - k) + k)) * (nDotL / (nDotL * (1.0 - k) + k));
}

vec3 fresnel(vec3 f0, float vDotH) {
  return f0 + (1.0 - f0) * pow(1.0 - vDotH, 5.0);
}

vec3 brdf(vec3 albedo, vec3 f0, float roughness, vec3 normal, vec3 view, vec3 toLight) {
  vec3 halfVector = normalize(toLight + view);
  float nDotL = max(dot(normal, toLight), 0.0);
  float nDotV = max(dot(normal, view), 1e-4);
  float nDotH = max(dot(normal, halfVector), 0.0);
  float vDotH = max(dot(view, halfVector), 0.0);
  vec3 fresnelTerm = fresnel(f0, vDotH);
  float distributionTerm = distribution(roughness, nDotH);
  float geometryTerm = geometry(roughness, nDotV, nDotL);
  vec3 specular = fresnelTerm * distributionTerm * geometryTerm / max(4.0 * nDotV * nDotL, 1e-4);

  return (albedo * (1.0 - fresnelTerm) + specular) * nDotL;
}

mat3 tangentFrame(vec3 normal) {
  vec3 dp1 = dFdx(vWorldPosition);
  vec3 dp2 = dFdy(vWorldPosition);
  vec2 duv1 = dFdx(vTextureCoordinate);
  vec2 duv2 = dFdy(vTextureCoordinate);
  vec3 dp2perp = cross(dp2, normal);
  vec3 dp1perp = cross(normal, dp1);
  vec3 tangent = dp2perp * duv1.x + dp1perp * duv2.x;
  vec3 bitangent = dp2perp * duv1.y + dp1perp * duv2.y;
  float scale = inversesqrt(max(dot(tangent, tangent), dot(bitangent, bitangent)));
  if (!(scale < 1e20)) scale = 1.0;

  return mat3(tangent * scale, bitangent * scale, normal);
}

void main() {
  vec2 uv = vTextureCoordinate;
  vec4 base = texture(uTextures[0], uv) * uTint * uBaseColorFactor;
  if (base.a < uAlphaCutoff) discard;

  vec3 mr = texture(uTextures[1], uv).rgb;
  float roughness = clamp(mix(1.0, mr.g, uMetallicRoughnessMap) * uRoughness, 0.04, 1.0);
  float metallic = clamp(mix(0.0, mr.b, uMetallicRoughnessMap) * uMetallic, 0.0, 1.0);
  float occlusion = mix(1.0, mr.r, uOcclusionStrength);
  vec3 albedo = base.rgb;
  vec3 f0 = mix(vec3(0.04), albedo, metallic);
  vec3 geometric = normalize(vWorldNormal);
  vec3 sampled = mix(vec3(0.0, 0.0, 1.0), texture(uTextures[2], uv).xyz * 2.0 - 1.0, uNormalMap);
  vec3 normal = normalize(tangentFrame(geometric) * vec3(sampled.xy * uNormalScale, sampled.z));
  vec3 view = normalize(uCameraPosition - vWorldPosition);
  vec3 emissive = mix(vec3(1.0), texture(uTextures[3], uv).rgb, uEmissiveMap) * uEmissiveFactor.rgb;

  vec3 diffuseAmbient = uAmbientColor * albedo * mix(0.35, 1.0, dot(normal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5);
  vec3 specularAmbient = uAmbientColor * f0 * mix(1.0, 0.2, roughness);
  vec3 color = (diffuseAmbient + specularAmbient) * occlusion;
  color += brdf(albedo, f0, roughness, normal, view, -uDirectionalDirection) * uDirectionalColor;

  for (int index = 0; index < maximumLights; index++) {
    if (index >= uLightCount) break;

    vec3 toLight = uLightPositions[index] - vWorldPosition;
    float distance = length(toLight);
    vec3 direction = toLight / max(distance, 1e-4);
    float falloff = clamp(1.0 - distance / uLightRanges[index], 0.0, 1.0);
    falloff *= falloff;
    float cone = 1.0;
    float coneCosine = uLightCones[index];
    if (coneCosine > -1.0) {
      float alignment = dot(-direction, uLightDirections[index]);
      cone = smoothstep(coneCosine, coneCosine + 0.05, alignment);
    }

    if (falloff <= 0.0 || cone <= 0.0) continue;

    color += brdf(albedo, f0, roughness, normal, view, direction) * uLightColors[index] * falloff * cone;
  }

  color += emissive;
  color = aces(color * uExposure);
  outColor = vec4(pow(color, vec3(1.0 / 2.2)), base.a);
}
`

/** Textures a material without maps binds, so every sampler reads white. */
const neutral = new Uint8Array([255, 255, 255, 255])

/** Shaders of the physical material, shared by every instance. */
const vertexShader = new Shader({
  code: vertexSource,
  language: ShaderLanguage.glsl,
  stage: ShaderStage.vertex,
})

const fragmentShader = new Shader({
  code: fragmentSource,
  language: ShaderLanguage.glsl,
  stage: ShaderStage.fragment,
})

/** Values a physical material uploads to its shader. */
export interface PbrUniforms {
  /** Base color multiplied with the base color texture and the tint. */
  readonly baseColor: {
    readonly r: number
    readonly g: number
    readonly b: number
    readonly a: number
  }
  /** Metallic factor, from `0` to `1`. */
  readonly metallic: number
  /** Roughness factor, from `0` to `1`. */
  readonly roughness: number
  /** Emissive color added after lighting. */
  readonly emissive: { readonly r: number; readonly g: number; readonly b: number }
  /** Strength of the normal map. */
  readonly normalScale: number
  /** Strength of the occlusion channel. */
  readonly occlusionStrength: number
  /** Alpha below which a fragment is discarded. */
  readonly alphaCutoff: number
  /** Exposure applied before the tone map. */
  readonly exposure: number
  /** Whether the material has a metallic-roughness map. */
  readonly metallicRoughnessMap: boolean
  /** Whether the material has a normal map. */
  readonly normalMap: boolean
  /** Whether the material has an emissive map. */
  readonly emissiveMap: boolean
}

/**
 * Creates the material the physical shader draws with.
 *
 * @param textures - Maps of the material, in sampler order: base color,
 * metallic-roughness, normal and emissive.
 * @param uniforms - Factors the shader multiplies the maps with.
 * @param blend - How the material blends with the destination.
 * @param neutralTexture - One-pixel white texture used for the missing maps.
 * @returns A material with the physical shader and its maps bound.
 */
export function createPbrMaterial(
  textures: readonly (TextureBinding | undefined)[],
  uniforms: PbrUniforms,
  blend: BlendMode,
  neutralTexture: TextureBinding,
): GraphicMaterial {
  const bindings = [0, 1, 2, 3].map((index) => textures[index] ?? neutralTexture)
  const { baseColor, emissive } = uniforms

  return new GraphicMaterial({
    vertexShader,
    fragmentShader,
    textures: bindings,
    blend,
    uniforms: [
      ['uBaseColorFactor', new Color(baseColor.r, baseColor.g, baseColor.b, baseColor.a)],
      ['uMetallic', uniforms.metallic],
      ['uRoughness', uniforms.roughness],
      ['uEmissiveFactor', new Color(emissive.r, emissive.g, emissive.b, 1)],
      ['uNormalScale', uniforms.normalScale],
      ['uOcclusionStrength', uniforms.occlusionStrength],
      ['uAlphaCutoff', uniforms.alphaCutoff],
      ['uExposure', uniforms.exposure],
      ['uMetallicRoughnessMap', uniforms.metallicRoughnessMap ? 1 : 0],
      ['uNormalMap', uniforms.normalMap ? 1 : 0],
      ['uEmissiveMap', uniforms.emissiveMap ? 1 : 0],
    ],
  })
}

/** One-pixel white pixels used for the maps a material does not have. */
export const neutralPixels: Uint8Array = neutral
