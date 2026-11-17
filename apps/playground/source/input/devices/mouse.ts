import { Mouse, MouseButtonEvent } from '@euphoria/engine'

/** Mouse with the actions the playground scenes bind. */
export class MyMouse extends Mouse {
  public primary: MouseButtonEvent = new MouseButtonEvent({
    identifier: 'primary',
    source: 0,
  })

  protected override *compose(): Generator<MouseButtonEvent> {
    yield this.primary
  }
}
