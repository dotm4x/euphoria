import { Vector2 } from '#/math/primitives/vectors/vector2.js'

/** Configuration shared by two-dimensional joints. */
export interface JointDescriptor2DOptions {
  /** Identifier of the body the joint is attached to. */
  readonly body: string
  /** Identifier of the other body the joint is attached to. */
  readonly other: string
  /** Stable identifier used to reconcile joints between steps; defaults to a random one. */
  readonly identifier?: string
  /** Whether the jointed bodies collide with each other; defaults to false. */
  readonly collideConnected?: boolean
}

/**
 * Describes a constraint between two bodies.
 *
 * Joints are immutable values that a backend creates, keeps or removes without
 * knowing about the objects that produced them. Both anchors are expressed in
 * the local space of the body they belong to.
 */
export abstract class JointDescriptor2D {
  /** Stable identifier used to reconcile joints between steps. */
  public readonly identifier: string

  /** Identifier of the body the joint is attached to. */
  public readonly body: string

  /** Identifier of the other body the joint is attached to. */
  public readonly other: string

  /** Whether the jointed bodies collide with each other. */
  public readonly collideConnected: boolean

  /**
   * @param options - Identity, the two bodies to constrain and their contact rule.
   */
  protected constructor({
    identifier = crypto.randomUUID(),
    body,
    other,
    collideConnected = false,
  }: JointDescriptor2DOptions) {
    this.identifier = identifier
    this.body = body
    this.other = other
    this.collideConnected = collideConnected
  }

  /**
   * Compares this joint with another by value.
   *
   * @param other - The joint to compare with.
   * @param tolerance - Absolute tolerance used for the anchors.
   * @returns Whether both joints describe the same constraint.
   */
  public abstract equals(other: JointDescriptor2D, tolerance?: number): boolean

  /**
   * Compares the identity, the bodies and the contact rule of two joints.
   *
   * @param other - The joint to compare with.
   * @returns Whether the shared joint fields are equal.
   */
  protected sameBase(other: JointDescriptor2D): boolean {
    return (
      this.identifier === other.identifier &&
      this.body === other.body &&
      this.other === other.other &&
      this.collideConnected === other.collideConnected
    )
  }
}

/** Configuration for a joint that keeps two bodies in a fixed relative pose. */
export interface FixedJoint2DOptions extends JointDescriptor2DOptions {
  /** Anchor in the local space of {@link JointDescriptor2DOptions.body}; defaults to the origin. */
  readonly anchor?: Vector2
  /** Anchor in the local space of {@link JointDescriptor2DOptions.other}; defaults to the origin. */
  readonly otherAnchor?: Vector2
}

/** A joint that keeps two bodies in a fixed relative pose. */
export class FixedJoint2D extends JointDescriptor2D {
  /** Anchor in the local space of the first body. */
  public readonly anchor: Vector2

  /** Anchor in the local space of the second body. */
  public readonly otherAnchor: Vector2

  /**
   * @param options - Identity, the two bodies and their anchors.
   */
  public constructor({
    anchor = new Vector2(0, 0),
    otherAnchor = new Vector2(0, 0),
    ...options
  }: FixedJoint2DOptions) {
    super(options)
    this.anchor = anchor
    this.otherAnchor = otherAnchor
  }

  /** @inheritDoc */
  public equals(other: JointDescriptor2D, tolerance: number = 1e-6): boolean {
    return (
      other instanceof FixedJoint2D &&
      this.sameBase(other) &&
      this.anchor.equals(other.anchor, tolerance) &&
      this.otherAnchor.equals(other.otherAnchor, tolerance)
    )
  }
}

/** Configuration for a joint that lets two bodies rotate around a shared pivot. */
export interface RevoluteJoint2DOptions extends JointDescriptor2DOptions {
  /** Pivot in the local space of {@link JointDescriptor2DOptions.body}; defaults to the origin. */
  readonly anchor?: Vector2
  /** Pivot in the local space of {@link JointDescriptor2DOptions.other}; defaults to the origin. */
  readonly otherAnchor?: Vector2
}

/** A joint that lets two bodies rotate around a shared pivot. */
export class RevoluteJoint2D extends JointDescriptor2D {
  /** Pivot in the local space of the first body. */
  public readonly anchor: Vector2

  /** Pivot in the local space of the second body. */
  public readonly otherAnchor: Vector2

  /**
   * @param options - Identity, the two bodies and their pivots.
   */
  public constructor({
    anchor = new Vector2(0, 0),
    otherAnchor = new Vector2(0, 0),
    ...options
  }: RevoluteJoint2DOptions) {
    super(options)
    this.anchor = anchor
    this.otherAnchor = otherAnchor
  }

  /** @inheritDoc */
  public equals(other: JointDescriptor2D, tolerance: number = 1e-6): boolean {
    return (
      other instanceof RevoluteJoint2D &&
      this.sameBase(other) &&
      this.anchor.equals(other.anchor, tolerance) &&
      this.otherAnchor.equals(other.otherAnchor, tolerance)
    )
  }
}
