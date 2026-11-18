import { Channel, ChannelPriority, NodeChannel, TimeModule, type Updatable } from '@euphoria/engine'

import { PlaygroundScenesModule } from '../scenes/module.js'
import { PlaygroundSimulationModule } from '../simulation/module.js'

/** Configuration for the time module of the playground. */
export interface PlaygroundTimeOptions {
  /** Object that draws and measures the frame. */
  readonly game: Updatable
  /** Update rate of the frame and scene channels, in hertz; defaults to `60`. */
  readonly targetUpdateRate?: number
}

/**
 * Drives the channels the playground runs.
 *
 * The channels are components of the module: it composes one for the frame, one
 * for the nodes of the active scene and one for the simulation, which runs last
 * so the frame draws what the previous step resolved.
 */
export class PlaygroundTimeModule extends TimeModule {
  private readonly _game: Updatable
  private readonly _targetUpdateRate: number

  /**
   * @param options - Object that draws the frame and the channel update rate.
   */
  public constructor({ game, targetUpdateRate = 60 }: PlaygroundTimeOptions) {
    super({
      dependencies: [{ type: PlaygroundScenesModule }, { type: PlaygroundSimulationModule }],
    })
    this._game = game
    this._targetUpdateRate = targetUpdateRate
  }

  protected override *compose(): Generator<Channel, void, unknown> {
    yield new Channel({
      identifier: 'main',
      targetUpdateRate: this._targetUpdateRate,
      priority: ChannelPriority.normal,
      entries: [this._game],
    })
    yield new NodeChannel({
      identifier: 'scenes',
      manager: this.require(PlaygroundScenesModule),
      targetUpdateRate: this._targetUpdateRate,
      priority: ChannelPriority.normal,
    })
    yield new Channel({
      identifier: 'physics',
      targetUpdateRate: 0,
      priority: ChannelPriority.low,
      entries: [this.require(PlaygroundSimulationModule)],
    })
  }
}
