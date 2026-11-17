import type * as Rapier from '@dimforge/rapier2d-compat'

import { Vector2 } from '#/math/primitives/vectors/vector2.js'
import { type BodyDescriptor2D } from '#/physics/descriptors/2d/body.js'
import { type ColliderDescriptor2D } from '#/physics/descriptors/2d/collider.js'
import { type JointDescriptor2D } from '#/physics/descriptors/2d/joint.js'
import { type BodyState2D } from '#/physics/descriptors/2d/state.js'
import { type BodyContact } from '#/physics/descriptors/contact.js'
import { type RayHit2D, type RayQueryOptions } from '#/physics/interfaces/ray.js'
import { Dimension } from '#/physics/primitives/dimension.js'
import { MotionType } from '#/physics/primitives/motion.js'

import {
  SimulationBackend2D,
  type SimulationFrame2D,
  type SimulationResult2D,
  type SimulationStats,
} from '../backend.js'

import {
  interactionGroups,
  motionBodyType,
  toColliderDesc,
  toJointData,
  toRigidBodyDesc,
} from './convert.js'

interface RapierColliderRecord {
  collider: Rapier.Collider
  descriptor: ColliderDescriptor2D
}

interface RapierRecord {
  body: Rapier.RigidBody
  colliders: Map<string, RapierColliderRecord>
  descriptor: BodyDescriptor2D
}

interface RapierJointRecord {
  joint: Rapier.ImpulseJoint
  descriptor: JointDescriptor2D
}

/** Configuration for a Rapier backend. */
export interface RapierBackend2DOptions {
  /** Unique backend identifier. */
  readonly identifier?: string
  /** Initial gravity, in world units per second squared; defaults to `(0, 9.81)`. */
  readonly gravity?: Vector2
}

/**
 * Runs a two-dimensional world with Rapier.
 *
 * Bodies are kept between steps and identified by the identifier of the object
 * that produced them: descriptors that repeat are reused, descriptors that
 * change are updated and descriptors that disappear remove their body. Forces
 * are applied as impulses scaled by each step, so a force accelerates a body
 * while it is described.
 *
 * The backend is created asynchronously because Rapier must load and
 * initialize its module before a world can exist.
 */
export class RapierBackend2D extends SimulationBackend2D {
  private readonly _rapier: typeof Rapier
  private readonly _world: Rapier.World
  private readonly _queue: Rapier.EventQueue
  private readonly _records: Map<string, RapierRecord> = new Map<string, RapierRecord>()
  private readonly _joints: Map<string, RapierJointRecord> = new Map<string, RapierJointRecord>()
  private readonly _owners: Map<number, string> = new Map<number, string>()
  private readonly _colliderIdentifiers: Map<number, string> = new Map<number, string>()
  private _contacts: BodyContact[] = []
  private _contactCount: number = 0
  private _steps: number = 0

  /** @inheritDoc */
  public override readonly dimension: Dimension = Dimension.twoDimensional

  /**
   * Creates a backend around an initialized Rapier module.
   *
   * @param rapier - The initialized Rapier module.
   * @param options - Backend identifier and initial gravity.
   * @throws {@link Error} If the identifier is empty.
   */
  public constructor(
    rapier: typeof Rapier,
    {
      identifier = 'org.js.euphoria.RapierBackend2D',
      gravity = new Vector2(0, 9.81),
    }: RapierBackend2DOptions = {},
  ) {
    super(identifier)
    this._rapier = rapier
    this._world = new rapier.World({ x: gravity.x, y: gravity.y })
    this._queue = new rapier.EventQueue(true)
  }

  /** @inheritDoc */
  public get stats(): SimulationStats {
    let colliders = 0
    for (const record of this._records.values()) colliders += record.colliders.size
    return {
      bodies: this._records.size,
      colliders,
      steps: this._steps,
      contacts: this._contactCount,
    }
  }

  /**
   * Loads Rapier and creates a backend around a new world.
   *
   * @param options - Backend identifier and initial gravity.
   * @returns The created backend, which owns its world.
   */
  public static async create(options: RapierBackend2DOptions = {}): Promise<RapierBackend2D> {
    const rapier = await import('@dimforge/rapier2d-compat')
    await rapier.init()

    return new RapierBackend2D(rapier, options)
  }

  /** @inheritDoc */
  public sync(frame: SimulationFrame2D): void {
    this.throwIfDestroyed()
    this._world.gravity = { x: frame.gravity.x, y: frame.gravity.y }
    const kept = new Set<string>()
    for (const descriptor of frame.bodies) {
      kept.add(descriptor.identifier)
      const record = this._records.get(descriptor.identifier)
      if (record === undefined) {
        this.createBody(descriptor)
        continue
      }

      this.updateBody(record, descriptor)
    }

    for (const identifier of [...this._records.keys()]) {
      if (!kept.has(identifier)) this.removeBody(identifier)
    }

    this.syncJoints(frame.joints)
  }

  /** @inheritDoc */
  public advance(deltaTime: number): void {
    this.throwIfDestroyed()
    const step = deltaTime > 0 ? deltaTime : 0
    this._world.timestep = step
    for (const { body, descriptor } of this._records.values()) {
      if (descriptor.motion !== MotionType.dynamic) continue
      if (descriptor.force.x !== 0 || descriptor.force.y !== 0) {
        body.applyImpulse({ x: descriptor.force.x * step, y: descriptor.force.y * step }, true)
      }

      if (descriptor.torque !== 0) body.applyTorqueImpulse(descriptor.torque * step, true)
    }

    this._world.step(this._queue)
    this._queue.drainCollisionEvents((first, second, started) => {
      const identifier = this._owners.get(first)
      const other = this._owners.get(second)
      if (identifier === undefined || other === undefined || identifier === other) return
      this._contacts.push(
        { identifier, other, started },
        { identifier: other, other: identifier, started },
      )
    })
    this._contactCount = this._contacts.length
    this._steps++
  }

  /** @inheritDoc */
  public read(): SimulationResult2D {
    this.throwIfDestroyed()
    const states: BodyState2D[] = []
    for (const [identifier, record] of this._records) {
      if (record.descriptor.motion !== MotionType.dynamic) continue
      const position = record.body.translation()
      const velocity = record.body.linvel()
      states.push({
        identifier,
        position: new Vector2(position.x, position.y),
        rotation: record.body.rotation(),
        linearVelocity: new Vector2(velocity.x, velocity.y),
        angularVelocity: record.body.angvel(),
        sleeping: record.body.isSleeping(),
      })
    }

    const contacts = this._contacts
    this._contacts = []

    return { states, contacts }
  }

  /** @inheritDoc */
  public castRay(
    origin: Vector2,
    direction: Vector2,
    maximumDistance: number,
    options: RayQueryOptions = {},
  ): RayHit2D | undefined {
    this.throwIfDestroyed()
    const length = Math.hypot(direction.x, direction.y)
    if (!Number.isFinite(length) || length === 0 || maximumDistance <= 0) return undefined
    const normalized = { x: direction.x / length, y: direction.y / length }
    const excluded =
      options.excludeBody === undefined ? undefined : this._records.get(options.excludeBody)?.body
    const hit = this._world.castRayAndGetNormal(
      new this._rapier.Ray({ x: origin.x, y: origin.y }, normalized),
      maximumDistance,
      options.solid ?? true,
      undefined,
      interactionGroups(0xffff, options.mask ?? 0xffff),
      undefined,
      excluded,
    )

    if (hit === null) return undefined
    return {
      body: this._owners.get(hit.collider.handle),
      collider: this._colliderIdentifiers.get(hit.collider.handle),
      distance: hit.timeOfImpact,
      point: new Vector2(
        origin.x + normalized.x * hit.timeOfImpact,
        origin.y + normalized.y * hit.timeOfImpact,
      ),
      normal: new Vector2(hit.normal.x, hit.normal.y),
    }
  }

  /** @inheritDoc */
  protected override onDestroy(): void {
    this._records.clear()
    this._joints.clear()
    this._owners.clear()
    this._colliderIdentifiers.clear()
    this._contacts = []
    this._world.free()
    this._queue.free()
    super.onDestroy()
  }

  private createBody(descriptor: BodyDescriptor2D): void {
    const body = this._world.createRigidBody(toRigidBodyDesc(this._rapier, descriptor))
    const colliders = new Map<string, RapierColliderRecord>()
    for (const collider of descriptor.colliders) {
      colliders.set(collider.identifier, this.createCollider(descriptor.identifier, body, collider))
    }

    this._records.set(descriptor.identifier, { body, colliders, descriptor })
  }

  private createCollider(
    identifier: string,
    body: Rapier.RigidBody,
    descriptor: ColliderDescriptor2D,
  ): RapierColliderRecord {
    const collider = this._world.createCollider(toColliderDesc(this._rapier, descriptor), body)
    this._owners.set(collider.handle, identifier)
    this._colliderIdentifiers.set(collider.handle, descriptor.identifier)
    return { collider, descriptor }
  }

  private removeBody(identifier: string): void {
    const record = this._records.get(identifier)
    if (record === undefined) return
    for (const { collider } of record.colliders.values()) {
      this._owners.delete(collider.handle)
      this._colliderIdentifiers.delete(collider.handle)
    }

    this._records.delete(identifier)
    this._world.removeRigidBody(record.body)
  }

  private updateBody(record: RapierRecord, descriptor: BodyDescriptor2D): void {
    if (record.descriptor.equals(descriptor)) return
    const { body } = record
    if (record.descriptor.motion !== descriptor.motion) {
      body.setBodyType(motionBodyType(this._rapier, descriptor.motion), true)
    }

    if (descriptor.teleport) {
      body.setRotation(descriptor.rotation, true)
      body.setTranslation({ x: descriptor.position.x, y: descriptor.position.y }, true)
    } else if (descriptor.motion === MotionType.kinematic) {
      body.setNextKinematicRotation(descriptor.rotation)
      body.setNextKinematicTranslation({ x: descriptor.position.x, y: descriptor.position.y })
    }

    if (descriptor.motion !== MotionType.dynamic) {
      body.setLinvel({ x: descriptor.linearVelocity.x, y: descriptor.linearVelocity.y }, true)
      body.setAngvel(descriptor.angularVelocity, true)
    }

    if (record.descriptor.linearDamping !== descriptor.linearDamping) {
      body.setLinearDamping(descriptor.linearDamping)
    }

    if (record.descriptor.angularDamping !== descriptor.angularDamping) {
      body.setAngularDamping(descriptor.angularDamping)
    }

    if (record.descriptor.gravityScale !== descriptor.gravityScale) {
      body.setGravityScale(descriptor.gravityScale, true)
    }

    if (record.descriptor.ccd !== descriptor.ccd) body.enableCcd(descriptor.ccd)
    if (descriptor.impulse.x !== 0 || descriptor.impulse.y !== 0) {
      body.applyImpulse({ x: descriptor.impulse.x, y: descriptor.impulse.y }, true)
    }

    if (descriptor.angularImpulse !== 0) body.applyTorqueImpulse(descriptor.angularImpulse, true)
    this.updateColliders(record, descriptor)
    record.descriptor = descriptor
  }

  private syncJoints(joints: readonly JointDescriptor2D[]): void {
    const kept = new Set<string>()
    for (const descriptor of joints) {
      kept.add(descriptor.identifier)
      const current = this._joints.get(descriptor.identifier)
      if (current === undefined) {
        this.createJoint(descriptor)
        continue
      }

      if (current.descriptor.equals(descriptor)) continue
      this.removeJoint(descriptor.identifier)
      this.createJoint(descriptor)
    }

    for (const identifier of [...this._joints.keys()]) {
      if (!kept.has(identifier)) this.removeJoint(identifier)
    }
  }

  private createJoint(descriptor: JointDescriptor2D): void {
    const body = this._records.get(descriptor.body)?.body
    const other = this._records.get(descriptor.other)?.body
    if (body === undefined || other === undefined) return
    const joint = this._world.createImpulseJoint(
      toJointData(this._rapier, descriptor),
      body,
      other,
      true,
    )
    joint.setContactsEnabled(descriptor.collideConnected)
    this._joints.set(descriptor.identifier, { joint, descriptor })
  }

  private removeJoint(identifier: string): void {
    const record = this._joints.get(identifier)
    if (record === undefined) return
    this._joints.delete(identifier)
    this._world.removeImpulseJoint(record.joint, true)
  }

  private updateColliders(record: RapierRecord, descriptor: BodyDescriptor2D): void {
    const kept = new Set<string>()
    for (const collider of descriptor.colliders) {
      kept.add(collider.identifier)
      const current = record.colliders.get(collider.identifier)
      if (current === undefined) {
        record.colliders.set(
          collider.identifier,
          this.createCollider(descriptor.identifier, record.body, collider),
        )
        continue
      }

      if (current.descriptor.equals(collider)) continue
      this._owners.delete(current.collider.handle)
      this._colliderIdentifiers.delete(current.collider.handle)
      this._world.removeCollider(current.collider, true)
      record.colliders.set(
        collider.identifier,
        this.createCollider(descriptor.identifier, record.body, collider),
      )
    }

    for (const [identifier, current] of [...record.colliders]) {
      if (kept.has(identifier)) continue
      this._owners.delete(current.collider.handle)
      this._colliderIdentifiers.delete(current.collider.handle)
      this._world.removeCollider(current.collider, true)
      record.colliders.delete(identifier)
    }
  }
}
