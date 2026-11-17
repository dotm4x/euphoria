import {
  Channel,
  ChannelPriority,
  NodeChannel,
  type ScenesModule,
  type SimulationModule,
  TimeModule,
  type Updatable,
} from '@euphoria/engine'

export class MyTimeModule extends TimeModule {
  public main: Channel
  public scenes: NodeChannel
  public physics: Channel

  public constructor(game: Updatable, scenes: ScenesModule, simulation: SimulationModule) {
    super()
    this.main = new Channel({
      identifier: 'main',
      targetUpdateRate: 60,
      priority: ChannelPriority.normal,
      entries: [game],
    })
    this.scenes = new NodeChannel({
      identifier: 'scenes',
      manager: scenes,
      targetUpdateRate: 60,
      priority: ChannelPriority.normal,
    })
    this.physics = new Channel({
      identifier: 'physics',
      targetUpdateRate: 0,
      priority: ChannelPriority.low,
      entries: [simulation],
    })
  }

  protected override *compose(): Generator<Channel> {
    yield this.main
    yield this.scenes
    yield this.physics
  }
}
