import {
  type AssetsModule,
  type GraphicMaterial,
  type Image,
  ImageTexture,
  type RenderBackend,
  TextureBinding,
  TextureSampler,
} from '@euphoria/engine'

/** Materials every story can draw with. */
export interface SceneMaterials {
  /** Two-dimensional material sampling the shared test texture. */
  readonly textured: GraphicMaterial
  /** Two-dimensional material without a texture, tinted per node. */
  readonly flat: GraphicMaterial
  /** Releases the material this runtime created. */
  readonly dispose: () => void
}

/**
 * Creates the materials stories draw with.
 *
 * The textured material belongs to the runtime, which disposes it with the rest
 * of the story; the flat one is the backend default and is destroyed
 * with the backend.
 *
 * @param backend - Backend that creates the material.
 * @param assets - Assets module that loads the shared texture.
 * @returns The materials, once the texture is loaded.
 */
export async function createSceneMaterials(
  backend: RenderBackend,
  assets: AssetsModule,
): Promise<SceneMaterials> {
  const image = await assets.load<Image>('/images/uv_grid.jpg')
  const textured = backend.createMaterial([
    new TextureBinding(new ImageTexture(image.value), new TextureSampler({ mipmaps: true })),
  ])

  return {
    textured,
    flat: backend.defaultMaterial,
    dispose: () => {
      if (!textured.destroyed) textured.destroy()
    },
  }
}
