import { type RenderBackend } from '#/modules/renderer/backends/backend.js'

import { type Font } from '../resources/font.js'
import { type GraphicMaterial } from '../resources/material.js'
import { TextureBinding } from '../resources/textures/binding.js'
import { ImageTexture } from '../resources/textures/image.js'
import { TextureSampler } from '../resources/textures/sampler.js'

/** Sampler used by font atlases, shared because it never changes. */
const atlasSampler: TextureSampler = new TextureSampler({ mipmaps: false })

/**
 * Creates a material that draws the atlas of a font.
 *
 * Materials belong to the backend, so a text node cannot build its own: this
 * helper is the one line that connects a font to the renderer. The material
 * borrows the atlas, so it must be destroyed before the font.
 *
 * @param backend - Backend that creates the material.
 * @param font - Font whose atlas the material samples.
 * @returns The material to hand to a text node.
 */
export function createFontMaterial(backend: RenderBackend, font: Font): GraphicMaterial {
  return backend.createMaterial([new TextureBinding(new ImageTexture(font.atlas), atlasSampler)])
}
