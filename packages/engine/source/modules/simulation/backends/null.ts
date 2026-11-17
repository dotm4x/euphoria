import { Vector2 } from '#/math/primitives/vectors/vector2.js'
import { type BodyDescriptor2D } from '#/physics/descriptors/2d/body.js'
import { type BodyState2D } from '#/physics/descriptors/2d/state.js'
import { Dimension } from '#/physics/primitives/dimension.js'
import { MotionType } from '#/physics/primitives/motion.js'

import {
  SimulationBackend2D,
  type SimulationFrame2D,
  type SimulationResult2D,
  type SimulationStats,
} from './backend.js'

interface NullRecord {
  descriptor: BodyDescriptor2D
  position: Vector2
  rotation: number
  linearVelocity: Vector2
  angularVelocity: number
}

/**
 * Integrates velocities without detecting collisions.
 *
 * The backend keeps the shape of a real one, including identity handling and
 * fixed steps, while resolving nothing: dynamic bodies follow gravity, forces,
 * impulses and damping through empty space. It is meant for tests, headless
 * previews and scenes that do not need contacts.
 *
 * Impulses are applied as direct velocity changes, so masses are ignored.
 */
export class NullSimulationBackend extends SimulationBackend2D {
  private readonly _records: Map<string, NullRecord> = new Map<string, NullRecord>()
  private _gravity: Vector2 = new Vector2(0, 0)
  private _steps: number = 0

  /** @inheritDoc */
  public override readonly dimension: Dimension = Dimension.twoDimensional

  /**
   * @param identifier - Backend identifier.
   */
  public constructor(identifier: string = 'org.js.euphoria.NullSimulationBackend') {
    super(identifier)
  }

  /** @inheritDoc */
  public get stats(): SimulationStats {
    let colliders = 0
    for (const record of this._records.values()) colliders += record.descriptor.colliders.length
    return { bodies: this._records.size, colliders, steps: this._steps, contacts: 0 }
  }

  /** @inheritDoc */
  public sync(frame: SimulationFrame2D): void {
    this.throwIfDestroyed()
    this._gravity = frame.gravity
    const kept = new Set<string>()
    for (const descriptor of frame.bodies) {
      kept.add(descriptor.identifier)
      this.syncBody(descriptor)
    }

    for (const identifier of [...this._records.keys()]) {
      if (!kept.has(identifier)) this._records.delete(identifier)
    }
  }

  /** @inheritDoc */
  public advance(deltaTime: number): void {
    this.throwIfDestroyed()
    const step = deltaTime > 0 ? deltaTime : 0
    for (const record of this._records.values()) {
      const { descriptor } = record
      if (descriptor.motion !== MotionType.dynamic) continue
      const velocity = record.linearVelocity
        .add(this._gravity.scale(descriptor.gravityScale * step))
        .add(descriptor.force.scale(step))
        .scale(1 / (1 + descriptor.linearDamping * step))
      record.linearVelocity = velocity
      record.position = record.position.add(velocity.scale(step))
      record.angularVelocity *= 1 / (1 + descriptor.angularDamping * step)
      record.rotation += record.angularVelocity * step
    }

    this._steps++
  }

  /** @inheritDoc */
  public castRay(): undefined {
    this.throwIfDestroyed()
    return undefined
  }

  /** @inheritDoc */
  public read(): SimulationResult2D {
    this.throwIfDestroyed()
    const states: BodyState2D[] = []
    for (const [identifier, record] of this._records) {
      if (record.descriptor.motion !== MotionType.dynamic) continue
      states.push({
        identifier,
        position: record.position,
        rotation: record.rotation,
        linearVelocity: record.linearVelocity,
        angularVelocity: record.angularVelocity,
        sleeping: false,
      })
    }

    return { states, contacts: [] }
  }

  private syncBody(descriptor: BodyDescriptor2D): void {
    const record = this._records.get(descriptor.identifier) ?? {
      descriptor,
      position: descriptor.position,
      rotation: descriptor.rotation,
      linearVelocity: descriptor.linearVelocity,
      angularVelocity: descriptor.angularVelocity,
    }

    this._records.set(descriptor.identifier, record)
    record.descriptor = descriptor
    if (descriptor.teleport) {
      record.position = descriptor.position
      record.rotation = descriptor.rotation
    }

    if (descriptor.motion !== MotionType.dynamic) {
      record.linearVelocity = descriptor.linearVelocity
      record.angularVelocity = descriptor.angularVelocity
      return
    }

    record.linearVelocity = record.linearVelocity.add(descriptor.impulse)
    record.angularVelocity += descriptor.angularImpulse
  }
}
