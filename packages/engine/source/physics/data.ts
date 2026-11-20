import { type BodyDescriptor2D } from './descriptors/2d/body.js'

/**
 * The bodies produced by a simulable object.
 *
 * Bodies are copied and frozen, then processed by the simulation system in the
 * order in which they appear. Simulation data does not advance the simulation
 * or depend on a specific backend.
 */
export class SimulationData2D {
  /** Bodies in processing order. */
  public readonly bodies: readonly BodyDescriptor2D[]

  /**
   * @param bodies - The bodies to include, in processing order.
   */
  public constructor(bodies: Iterable<BodyDescriptor2D>) {
    this.bodies = Object.freeze([...bodies])
  }
}
