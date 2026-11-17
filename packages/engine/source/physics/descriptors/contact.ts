/**
 * A contact reported by a simulation step.
 *
 * Contacts are produced by a backend after the world advances and are published
 * by the space that owns the bodies involved. They describe identities only, so
 * the same shape serves every dimensionality.
 */
export interface BodyContact {
  /** Identifier of the body involved in the contact. */
  readonly identifier: string
  /** Identifier of the other body involved in the contact. */
  readonly other: string
  /** Whether the contact started or ended during the step. */
  readonly started: boolean
}
