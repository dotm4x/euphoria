/**
 * The state available while producing simulation data for a step.
 *
 * A simulation context contains timing information only; it does not advance
 * the simulation or depend on a specific backend.
 */
export interface SimulationContext {
  /** Delta time of the update that drives the simulation, in seconds. */
  readonly deltaTime: number
  /** Length of an individual step, in seconds. */
  readonly fixedDeltaTime: number
  /** Number of steps executed by the space before this one. */
  readonly step: number
}
