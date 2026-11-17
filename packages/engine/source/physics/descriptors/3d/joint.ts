import { Vector3 } from '#/math/primitives/vectors/vector3.js'

/** Configuration shared by three-dimensional joints. */
export interface JointDescriptor3DOptions {
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
export abstract class JointDescriptor3D {
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
  }: JointDescriptor3DOptions) {
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
  public abstract equals(other: JointDescriptor3D, tolerance?: number): boolean

  /**
   * Compares the identity, the bodies and the contact rule of two joints.
   *
   * @param other - The joint to compare with.
   * @returns Whether the shared joint fields are equal.
   */
  protected sameBase(other: JointDescriptor3D): boolean {
    return (
      this.identifier === other.identifier &&
      this.body === other.body &&
      this.other === other.other &&
      this.collideConnected === other.collideConnected
    )
  }
}

/** Configuration for a joint that keeps two bodies in a fixed relative pose. */
export interface FixedJoint3DOptions extends JointDescriptor3DOptions {
  /** Anchor in the local space of {@link JointDescriptor3DOptions.body}; defaults to the origin. */
  readonly anchor?: Vector3
  /** Anchor in the local space of {@link JointDescriptor3DOptions.other}; defaults to the origin. */
  readonly otherAnchor?: Vector3
}

/** A joint that keeps two bodies in a fixed relative pose. */
export class FixedJoint3D extends JointDescriptor3D {
  /** Anchor in the local space of the first body. */
  public readonly anchor: Vector3

  /** Anchor in the local space of the second body. */
  public readonly otherAnchor: Vector3

  /**
   * @param options - Identity, the two bodies and their anchors.
   */
  public constructor({
    anchor = new Vector3(0, 0, 0),
    otherAnchor = new Vector3(0, 0, 0),
    ...options
  }: FixedJoint3DOptions) {
    super(options)
    this.anchor = anchor
    this.otherAnchor = otherAnchor
  }

  /** @inheritDoc */
  public equals(other: JointDescriptor3D, tolerance: number = 1e-6): boolean {
    return (
      other instanceof FixedJoint3D &&
      this.sameBase(other) &&
      this.anchor.equals(other.anchor, tolerance) &&
      this.otherAnchor.equals(other.otherAnchor, tolerance)
    )
  }
}

/** Configuration for a joint that lets two bodies rotate around a shared pivot. */
export interface RevoluteJoint3DOptions extends JointDescriptor3DOptions {
  /** Pivot in the local space of {@link JointDescriptor3DOptions.body}; defaults to the origin. */
  readonly anchor?: Vector3
  /** Pivot in the local space of {@link JointDescriptor3DOptions.other}; defaults to the origin. */
  readonly otherAnchor?: Vector3
  /** Axis the bodies rotate around; defaults to the Z axis. */
  readonly axis?: Vector3
}

/** A joint that lets two bodies rotate around a shared pivot. */
export class RevoluteJoint3D extends JointDescriptor3D {
  /** Pivot in the local space of the first body. */
  public readonly anchor: Vector3

  /** Pivot in the local space of the second body. */
  public readonly otherAnchor: Vector3

  /** Axis the bodies rotate around. */
  public readonly axis: Vector3

  /**
   * @param options - Identity, the two bodies, their pivots and the hinge axis.
   */
  public constructor({
    anchor = new Vector3(0, 0, 0),
    otherAnchor = new Vector3(0, 0, 0),
    axis = new Vector3(0, 0, 1),
    ...options
  }: RevoluteJoint3DOptions) {
    super(options)
    this.anchor = anchor
    this.otherAnchor = otherAnchor
    this.axis = axis
  }

  /** @inheritDoc */
  public equals(other: JointDescriptor3D, tolerance: number = 1e-6): boolean {
    return (
      other instanceof RevoluteJoint3D &&
      this.sameBase(other) &&
      this.anchor.equals(other.anchor, tolerance) &&
      this.otherAnchor.equals(other.otherAnchor, tolerance) &&
      this.axis.equals(other.axis, tolerance)
    )
  }
}
