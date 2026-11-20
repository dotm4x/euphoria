import { type SimulationData2D } from '../data.js'
import { type BodyState2D } from '../descriptors/2d/state.js'
import { type ContactPoint2D } from '../descriptors/contact.js'

import { type SimulationContext } from './context.js'

/**
 * An object that describes one or more bodies during a step.
 *
 * Simulables describe their physical representation without advancing the
 * simulation or depending on a specific backend. The identity of each body
 * lives in its descriptor: an object that produces the same body across steps
 * must reuse the same identifier, which nodes take from their own identifier.
 */
export interface Simulable2D {
  /**
   * Produces the simulation data for this object.
   *
   * @param context - Step state available while producing the data.
   * @returns The bodies this object contributes to the step.
   */
  simulate(context: SimulationContext): SimulationData2D

  /**
   * Receives the state resolved by the simulation.
   *
   * Objects that only describe bodies, such as area sensors, can omit it.
   *
   * @param state - The state of a body produced by this object.
   */
  applyState?(state: BodyState2D): void

  /**
   * Receives a contact of the bodies this object produced.
   *
   * The space resolves both sides of the contact to the objects that produced
   * them, so an object can react without knowing any identifier.
   *
   * @param contact - The contact, with the objects that own each body.
   */
  notifyContact?(contact: SimulableContact2D): void

  /**
   * Receives the contacts that still overlap after a step.
   *
   * It replaces the previous list, so an object can ask whether it is touching
   * something without tracking enter and exit events.
   *
   * @param contacts - Contacts that remain touching, with their points.
   */
  notifyTouching?(contacts: readonly SimulableContact2D[]): void
}

/**
 * A contact of a two-dimensional body, resolved to the objects that own it.
 *
 * The space resolves both sides before publishing the contact, so scenes react
 * with objects instead of identifiers.
 */
export interface SimulableContact2D {
  /** Object that produced the body the contact belongs to. */
  readonly owner: Simulable2D
  /** Object that produced the other body, when the same space owns it. */
  readonly other: Simulable2D | undefined
  /** Identifier of the collider of the body, when it has one. */
  readonly collider: string | undefined
  /** Identifier of the collider of the other body, when it has one. */
  readonly otherCollider: string | undefined
  /** Whether the contact began during the step. */
  readonly started: boolean
  /** Whether both shapes still overlap after the step. */
  readonly touching: boolean
  /** Points of the contact, empty for sensors and for contacts that ended. */
  readonly points: readonly ContactPoint2D[]
}

/**
 * Checks whether an object can describe bodies for a two-dimensional simulation.
 *
 * @param value - The object to inspect.
 * @returns Whether the object implements {@link Simulable2D}.
 */
export function isSimulable2D(value: object): value is Simulable2D {
  return 'simulate' in value && typeof value.simulate === 'function'
}

/**
 * Checks whether an object accepts the state resolved by a two-dimensional simulation.
 *
 * @param value - The object to inspect.
 * @returns Whether the object implements `applyState`.
 */
export function acceptsState2D(
  value: Simulable2D,
): value is Simulable2D & { applyState(state: BodyState2D): void } {
  return typeof value.applyState === 'function'
}
