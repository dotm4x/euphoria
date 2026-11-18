import type * as Rapier from '@dimforge/rapier3d-compat'

import { Vector3 } from '#/math/primitives/vectors/vector3.js'
import { type BodyDescriptor3D } from '#/physics/descriptors/3d/body.js'
import { type ColliderDescriptor3D } from '#/physics/descriptors/3d/collider.js'
import { type JointDescriptor3D } from '#/physics/descriptors/3d/joint.js'
import { type BodyState3D } from '#/physics/descriptors/3d/state.js'
import { type BodyContact3D, type ContactPoint3D } from '#/physics/descriptors/contact.js'
import { type RayHit3D, type RayQueryOptions } from '#/physics/interfaces/ray.js'
import { Dimension } from '#/physics/primitives/dimension.js'
import { MotionType } from '#/physics/primitives/motion.js'

import {
  SimulationBackend3D,
  type SimulationFrame3D,
  type SimulationResult3D,
  type SimulationStats,
} from '../backend.js'

import {
  applyMassProperties,
  eulerToRotation,
  interactionGroups,
  motionBodyType,
  rotationToEuler,
  toColliderDesc,
  toJointData,
  toRigidBodyDesc,
} from './convert.js'

interface RapierColliderRecord {
  collider: Rapier.Collider
  descriptor: ColliderDescriptor3D
}

interface RapierRecord {
  body: Rapier.RigidBody
  colliders: Map<string, RapierColliderRecord>
  descriptor: BodyDescriptor3D
}

interface RapierJointRecord {
  joint: Rapier.ImpulseJoint
  descriptor: JointDescriptor3D
}

/** Configuration for a Rapier backend in space. */
export interface RapierBackend3DOptions {
  /** Unique backend identifier. */
  readonly identifier?: string
  /** Initial gravity, in world units per second squared; defaults to `(0, -9.81, 0)`. */
  readonly gravity?: Vector3
}

/**
 * Runs a three-dimensional world with Rapier.
 *
 * Bodies are kept between steps and identified by the identifier of the object
 * that produced them: descriptors that repeat are reused, descriptors that
 * change are updated and descriptors that disappear remove their body. Forces
 * are applied as impulses scaled by each step, so a force accelerates a body
 * while it is described.
 *
 * Rotations are exchanged as roll, pitch and yaw angles, matching the rotation
 * order of three-dimensional nodes.
 *
 * The backend is created asynchronously because Rapier must load and
 * initialize its module before a world can exist.
 */
export class RapierBackend3D extends SimulationBackend3D {
  private readonly _rapier: typeof Rapier
  private readonly _world: Rapier.World
  private readonly _records: Map<string, RapierRecord> = new Map<string, RapierRecord>()
  private readonly _joints: Map<string, RapierJointRecord> = new Map<string, RapierJointRecord>()
  private readonly _owners: Map<number, string> = new Map<number, string>()
  private readonly _colliderIdentifiers: Map<number, string> = new Map<number, string>()
  private _contacts: BodyContact3D[] = []
  private _contactCount: number = 0
  private _previousPairs: Map<string, ColliderRef3D[]> = new Map<string, ColliderRef3D[]>()
  private _steps: number = 0

  /** @inheritDoc */
  public override readonly dimension: Dimension = Dimension.threeDimensional

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
      identifier = 'org.js.euphoria.RapierBackend3D',
      gravity = new Vector3(0, -9.81, 0),
    }: RapierBackend3DOptions = {},
  ) {
    super(identifier)
    this._rapier = rapier
    this._world = new rapier.World({ x: gravity.x, y: gravity.y, z: gravity.z })
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
  public static async create(options: RapierBackend3DOptions = {}): Promise<RapierBackend3D> {
    const rapier = await import('@dimforge/rapier3d-compat')
    await rapier.init()

    return new RapierBackend3D(rapier, options)
  }

  /** @inheritDoc */
  public sync(frame: SimulationFrame3D): void {
    this.throwIfDestroyed()
    this._world.gravity = { x: frame.gravity.x, y: frame.gravity.y, z: frame.gravity.z }
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
      const force = descriptor.force
      if (force.x !== 0 || force.y !== 0 || force.z !== 0) {
        body.applyImpulse({ x: force.x * step, y: force.y * step, z: force.z * step }, true)
      }

      const torque = descriptor.torque
      if (torque.x !== 0 || torque.y !== 0 || torque.z !== 0) {
        body.applyTorqueImpulse(
          { x: torque.x * step, y: torque.y * step, z: torque.z * step },
          true,
        )
      }
    }

    this._world.step()
    this._steps++
  }

  /** @inheritDoc */
  public read(): SimulationResult3D {
    this.throwIfDestroyed()
    const states: BodyState3D[] = []
    for (const [identifier, record] of this._records) {
      if (record.descriptor.motion !== MotionType.dynamic) continue
      const position = record.body.translation()
      const velocity = record.body.linvel()
      const angular = record.body.angvel()
      states.push({
        identifier,
        position: new Vector3(position.x, position.y, position.z),
        rotation: rotationToEuler(record.body.rotation()),
        linearVelocity: new Vector3(velocity.x, velocity.y, velocity.z),
        angularVelocity: new Vector3(angular.x, angular.y, angular.z),
        sleeping: record.body.isSleeping(),
      })
    }

    const contacts = this.collectContacts()
    this._contactCount = contacts.length
    this._contacts = contacts

    return { states, contacts }
  }

  /** @inheritDoc */
  public castRay(
    origin: Vector3,
    direction: Vector3,
    maximumDistance: number,
    options: RayQueryOptions = {},
  ): RayHit3D | undefined {
    this.throwIfDestroyed()
    const length = Math.hypot(direction.x, direction.y, direction.z)
    if (!Number.isFinite(length) || length === 0 || maximumDistance <= 0) return undefined
    const normalized = { x: direction.x / length, y: direction.y / length, z: direction.z / length }
    const excluded =
      options.excludeBody === undefined ? undefined : this._records.get(options.excludeBody)?.body
    const hit = this._world.castRayAndGetNormal(
      new this._rapier.Ray({ x: origin.x, y: origin.y, z: origin.z }, normalized),
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
      point: new Vector3(
        origin.x + normalized.x * hit.timeOfImpact,
        origin.y + normalized.y * hit.timeOfImpact,
        origin.z + normalized.z * hit.timeOfImpact,
      ),
      normal: new Vector3(hit.normal.x, hit.normal.y, hit.normal.z),
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
    super.onDestroy()
  }

  private collectContacts(): BodyContact3D[] {
    const contacts: BodyContact3D[] = []
    const visited = new Set<string>()
    const touching = new Map<string, ColliderRef3D[]>()
    for (const record of this._records.values()) {
      for (const { collider } of record.colliders.values()) {
        this._world.contactPairsWith(collider, (other) => {
          this.collectPair(contacts, visited, touching, collider, other, false)
          return true
        })
        this._world.intersectionPairsWith(collider, (other) => {
          this.collectPair(contacts, visited, touching, collider, other, true)
          return true
        })
      }
    }

    for (const [key, pair] of this._previousPairs) {
      if (touching.has(key)) continue
      const first = pair[0]
      const second = pair[1]
      if (first === undefined || second === undefined) continue
      contacts.push(endedContact3D(first, second), endedContact3D(second, first))
    }

    this._previousPairs = touching
    return contacts
  }

  private collectPair(
    contacts: BodyContact3D[],
    visited: Set<string>,
    touching: Map<string, ColliderRef3D[]>,
    first: Rapier.Collider,
    second: Rapier.Collider,
    sensor: boolean,
  ): void {
    const key = pairKey(first.handle, second.handle)
    if (visited.has(key)) return
    visited.add(key)
    const points = sensor ? [] : this.manifoldPoints(first, second)
    if (!sensor && points.length === 0) return
    const firstRef = this.reference(first)
    const secondRef = this.reference(second)
    if (firstRef === undefined || secondRef === undefined) return
    touching.set(key, [firstRef, secondRef])
    const started = !this._previousPairs.has(key)
    contacts.push(
      contact3D(firstRef, secondRef, started, points),
      contact3D(secondRef, firstRef, started, flipPoints3D(points)),
    )
  }

  private reference(collider: Rapier.Collider): ColliderRef3D | undefined {
    const identifier = this._owners.get(collider.handle)
    if (identifier === undefined) return undefined
    return { identifier, collider: this._colliderIdentifiers.get(collider.handle) }
  }

  private manifoldPoints(first: Rapier.Collider, second: Rapier.Collider): ContactPoint3D[] {
    const points: ContactPoint3D[] = []
    this._world.contactPair(first, second, (manifold, flipped) => {
      const normal = manifold.normal()
      const count = manifold.numSolverContacts()
      for (let index = 0; index < count; index++) {
        const point = manifold.solverContactPoint(index)
        if (point === null) continue
        points.push({
          point: new Vector3(point.x, point.y, point.z),
          normal: new Vector3(
            flipped ? normal.x : -normal.x,
            flipped ? normal.y : -normal.y,
            flipped ? normal.z : -normal.z,
          ),
          impulse: manifold.contactImpulse(index),
          distance: manifold.solverContactDist(index),
        })
      }
    })

    return points
  }

  private createBody(descriptor: BodyDescriptor3D): void {
    const body = this._world.createRigidBody(toRigidBodyDesc(this._rapier, descriptor))
    const colliders = new Map<string, RapierColliderRecord>()
    for (const collider of descriptor.colliders) {
      colliders.set(collider.identifier, this.createCollider(descriptor.identifier, body, collider))
    }

    applyMassProperties(body, descriptor)
    applyPushes(body, descriptor)
    applyMassProperties(body, descriptor)
    applyPushes(body, descriptor)
    this._records.set(descriptor.identifier, { body, colliders, descriptor })
  }

  private createCollider(
    identifier: string,
    body: Rapier.RigidBody,
    descriptor: ColliderDescriptor3D,
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

  private syncJoints(joints: readonly JointDescriptor3D[]): void {
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

  private createJoint(descriptor: JointDescriptor3D): void {
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

  private updateBody(record: RapierRecord, descriptor: BodyDescriptor3D): void {
    if (record.descriptor.equals(descriptor)) return
    const { body } = record
    if (record.descriptor.motion !== descriptor.motion) {
      body.setBodyType(motionBodyType(this._rapier, descriptor.motion), true)
    }

    if (descriptor.teleport) {
      body.setRotation(eulerToRotation(descriptor.rotation), true)
      const position = descriptor.position
      body.setTranslation({ x: position.x, y: position.y, z: position.z }, true)
    } else if (descriptor.motion === MotionType.kinematic) {
      body.setNextKinematicRotation(eulerToRotation(descriptor.rotation))
      const position = descriptor.position
      body.setNextKinematicTranslation({ x: position.x, y: position.y, z: position.z })
    }

    if (descriptor.motion !== MotionType.dynamic) {
      const velocity = descriptor.linearVelocity
      body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true)
      const angular = descriptor.angularVelocity
      body.setAngvel({ x: angular.x, y: angular.y, z: angular.z }, true)
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
    applyPushes(body, descriptor)
    this.updateColliders(record, descriptor)
    if (
      record.descriptor.mass !== descriptor.mass ||
      !record.descriptor.inertia.equals(descriptor.inertia)
    ) {
      applyMassProperties(record.body, descriptor)
    }

    record.descriptor = descriptor
  }

  private updateColliders(record: RapierRecord, descriptor: BodyDescriptor3D): void {
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

function applyPushes(body: Rapier.RigidBody, descriptor: BodyDescriptor3D): void {
  if (descriptor.motion !== MotionType.dynamic) return
  const impulse = descriptor.impulse
  if (impulse.x !== 0 || impulse.y !== 0 || impulse.z !== 0) {
    body.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true)
  }

  const angularImpulse = descriptor.angularImpulse
  if (angularImpulse.x !== 0 || angularImpulse.y !== 0 || angularImpulse.z !== 0) {
    body.applyTorqueImpulse({ x: angularImpulse.x, y: angularImpulse.y, z: angularImpulse.z }, true)
  }
}

interface ColliderRef3D {
  readonly identifier: string
  readonly collider: string | undefined
}

function pairKey(first: number, second: number): string {
  return first < second
    ? `${first.toString()}:${second.toString()}`
    : `${second.toString()}:${first.toString()}`
}

function contact3D(
  own: ColliderRef3D,
  other: ColliderRef3D,
  started: boolean,
  points: readonly ContactPoint3D[],
): BodyContact3D {
  return {
    identifier: own.identifier,
    collider: own.collider,
    other: other.identifier,
    otherCollider: other.collider,
    started,
    touching: true,
    points,
  }
}

function endedContact3D(own: ColliderRef3D, other: ColliderRef3D): BodyContact3D {
  return {
    identifier: own.identifier,
    collider: own.collider,
    other: other.identifier,
    otherCollider: other.collider,
    started: false,
    touching: false,
    points: [],
  }
}

function flipPoints3D(points: readonly ContactPoint3D[]): ContactPoint3D[] {
  return points.map((point) => ({
    ...point,
    normal: new Vector3(-point.normal.x, -point.normal.y, -point.normal.z),
  }))
}
