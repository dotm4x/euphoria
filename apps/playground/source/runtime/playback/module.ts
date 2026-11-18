import {
  AudioBus,
  type Node,
  PlaybackModule,
  type PlaybackModuleOptions,
  WebAudioBackend,
} from '@euphoria/engine'

/** Configuration for the playback module of the playground. */
export interface PlaygroundPlaybackOptions {
  /** Scene whose nodes are sounded by the module. */
  readonly scene: Node
  /** Whether every voice starts silenced. */
  readonly muted?: boolean | undefined
}

/**
 * Sounds the story of the playground.
 *
 * The backend is Web Audio, the scene is one entry, and the listener is
 * whatever camera the story hangs its audio listener from, so a story only has
 * to add the nodes it wants to hear.
 */
export class PlaygroundPlaybackModule extends PlaybackModule {
  /**
   * @param options - Scene to sound and whether it starts muted.
   */
  public constructor({ scene, muted = false }: PlaygroundPlaybackOptions) {
    super({
      backend: new WebAudioBackend(),
      entries: [scene],
      buses: [
        new AudioBus({ identifier: 'music', volume: 0.5 }),
        new AudioBus({ identifier: 'sfx', volume: 0.9 }),
      ],
      muted,
    } satisfies PlaybackModuleOptions)
  }
}
