import {
  AssetsModule,
  AudioClipImporter,
  FontImporter,
  GltfImporter,
  ImageImporter,
} from '@euphoria/engine'

/**
 * Assets module of the playground.
 *
 * The importers are components of the module, so nothing outside this folder
 * knows which formats the playground understands. They are registered in the
 * constructor because the runtime loads the shared texture before the engine
 * starts, where the `compose` hook would run too late.
 */
export class PlaygroundAssetsModule extends AssetsModule {
  public constructor() {
    super({
      importers: [
        new ImageImporter(),
        new AudioClipImporter(),
        // Fonts rasterize at the size the stories draw at, so glyphs stay crisp.
        new FontImporter({ size: 32 }),
        new GltfImporter(),
      ],
    })
  }
}
