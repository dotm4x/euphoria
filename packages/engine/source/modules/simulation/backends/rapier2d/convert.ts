import type * as Rapier from '@dimforge/rapier2d-compat'

import { type BodyDescriptor2D } from '#/physics/descriptors/2d/body.js'
import { type ColliderDescriptor2D } from '#/physics/descriptors/2d/collider.js'
import {
  FixedJoint2D,
  type JointDescriptor2D,
  RevoluteJoint2D,
} from '#/physics/descriptors/2d/joint.js'
import { MotionType } from '#/physics/primitives/motion.js'
import { type Shape2D } from '#/physics/primitives/shape.js'

/**
 * Converts a body descriptor into a rigid body description.
 *
 * @param rapier - The Rapier module in use.
 * @param descriptor - The body to describe.
 * @returns A rigid body description owned by the caller.
 */
export function toRigidBodyDesc(
  rapier: typeof Rapier,
  descriptor: BodyDescriptor2D,
): Rapier.RigidBodyDesc {
  const description = motionDescription(rapier, descriptor.motion)

  description.setTranslation(descriptor.position.x, descriptor.position.y)
  description.setRotation(descriptor.rotation)
  description.setLinearDamping(descriptor.linearDamping)
  description.setAngularDamping(descriptor.angularDamping)
  description.setGravityScale(descriptor.gravityScale)
  description.setCcdEnabled(descriptor.ccd)
  description.setCanSleep(descriptor.sleepAllowed)
  description.setLinvel(descriptor.linearVelocity.x, descriptor.linearVelocity.y)
  description.setAngvel(descriptor.angularVelocity)

  return description
}

/**
 * Converts a collider descriptor into a collider description.
 *
 * @param rapier - The Rapier module in use.
 * @param descriptor - The collider to describe.
 * @returns A collider description owned by the caller.
 * @throws {@link Error} If a polygon shape has no convex hull.
 */
export function toColliderDesc(
  rapier: typeof Rapier,
  descriptor: ColliderDescriptor2D,
): Rapier.ColliderDesc {
  const description = shapeDescription(rapier, descriptor.shape)

  description.setTranslation(descriptor.offset.x, descriptor.offset.y)
  description.setRotation(descriptor.rotation)
  description.setSensor(descriptor.sensor)
  description.setCollisionGroups(interactionGroups(descriptor.layer, descriptor.mask))
  description.setActiveEvents(rapier.ActiveEvents.COLLISION_EVENTS)
  if (descriptor.material !== undefined) {
    description.setFriction(descriptor.material.friction)
    description.setRestitution(descriptor.material.restitution)
    description.setDensity(descriptor.material.density)
  }

  return description
}

/**
 * Converts a motion type into a rigid body description.
 *
 * @param rapier - The Rapier module in use.
 * @param motion - The motion to describe.
 * @returns A rigid body description owned by the caller.
 */
export function motionDescription(rapier: typeof Rapier, motion: MotionType): Rapier.RigidBodyDesc {
  switch (motion) {
    case MotionType.static: {
      return rapier.RigidBodyDesc.fixed()
    }

    case MotionType.kinematic: {
      return rapier.RigidBodyDesc.kinematicPositionBased()
    }

    case MotionType.dynamic: {
      return rapier.RigidBodyDesc.dynamic()
    }
  }

  throw new Error(`Unsupported motion type '${String(motion)}'.`)
}

/**
 * Converts a motion type into a rigid body type.
 *
 * @param rapier - The Rapier module in use.
 * @param motion - The motion to convert.
 * @returns The matching rigid body type.
 */
export function motionBodyType(rapier: typeof Rapier, motion: MotionType): Rapier.RigidBodyType {
  switch (motion) {
    case MotionType.static: {
      return rapier.RigidBodyType.Fixed
    }

    case MotionType.kinematic: {
      return rapier.RigidBodyType.KinematicPositionBased
    }

    case MotionType.dynamic: {
      return rapier.RigidBodyType.Dynamic
    }
  }

  throw new Error(`Unsupported motion type '${String(motion)}'.`)
}

function shapeDescription(rapier: typeof Rapier, shape: Shape2D): Rapier.ColliderDesc {
  switch (shape.kind) {
    case 'box': {
      return rapier.ColliderDesc.cuboid(shape.halfExtents.x, shape.halfExtents.y)
    }

    case 'capsule': {
      return rapier.ColliderDesc.capsule(shape.halfHeight, shape.radius)
    }

    case 'circle': {
      return rapier.ColliderDesc.ball(shape.radius)
    }

    case 'polygon': {
      const points = new Float32Array(shape.points.length * 2)
      for (const [index, point] of shape.points.entries()) {
        points[index * 2] = point.x
        points[index * 2 + 1] = point.y
      }

      const description = rapier.ColliderDesc.convexHull(points)
      if (description === null) {
        throw new Error('A polygon collider requires at least three non collinear vertices.')
      }

      return description
    }

    case 'segment': {
      return rapier.ColliderDesc.segment(
        { x: shape.from.x, y: shape.from.y },
        { x: shape.to.x, y: shape.to.y },
      )
    }
  }

  throw new Error('Unsupported shape kind.')
}

/**
 * Packs a collision layer and mask into Rapier interaction groups.
 *
 * @param layer - Membership layers, as a 16-bit mask.
 * @param mask - Filter layers, as a 16-bit mask.
 * @returns The packed interaction groups.
 */
export function interactionGroups(layer: number, mask: number): number {
  return (((layer & 0xffff) << 16) | (mask & 0xffff)) >>> 0
}

/**
 * Converts a joint descriptor into joint data.
 *
 * @param rapier - The Rapier module in use.
 * @param descriptor - The joint to describe.
 * @returns The joint data owned by the caller.
 */
export function toJointData(
  rapier: typeof Rapier,
  descriptor: JointDescriptor2D,
): Rapier.JointData {
  if (descriptor instanceof FixedJoint2D) {
    const anchor = { x: descriptor.anchor.x, y: descriptor.anchor.y }
    const otherAnchor = { x: descriptor.otherAnchor.x, y: descriptor.otherAnchor.y }
    return rapier.JointData.fixed(anchor, 0, otherAnchor, 0)
  }

  if (descriptor instanceof RevoluteJoint2D) {
    const anchor = { x: descriptor.anchor.x, y: descriptor.anchor.y }
    const otherAnchor = { x: descriptor.otherAnchor.x, y: descriptor.otherAnchor.y }
    return rapier.JointData.revolute(anchor, otherAnchor)
  }

  throw new Error('Unsupported joint type.')
}

/**
 * Applies the mass distribution of a descriptor to a body that already owns its
 * colliders.
 *
 * An explicit mass scales the collider densities, so the shapes still provide a
 * consistent inertia. An explicit inertia replaces both, so the colliders stop
 * contributing mass.
 *
 * @param body - Body whose colliders exist.
 * @param descriptor - Descriptor that carries the requested mass and inertia.
 * @throws {@link Error} If an inertia is requested without a mass.
 */
export function applyMassProperties(body: Rapier.RigidBody, descriptor: BodyDescriptor2D): void {
  if (descriptor.mass <= 0) {
    if (descriptor.inertia > 0) {
      throw new Error('An explicit inertia requires an explicit body mass.')
    }

    return
  }

  if (descriptor.inertia > 0) {
    for (let index = 0; index < body.numColliders(); index++) {
      body.collider(index).setDensity(0)
    }

    // The body adds these properties to its colliders at the next step, so the
    // colliders must not contribute and the properties must not be recomputed here.
    body.setAdditionalMassProperties(descriptor.mass, { x: 0, y: 0 }, descriptor.inertia, true)
    return
  }

  let total = 0
  for (let index = 0; index < body.numColliders(); index++) {
    total += body.collider(index).mass()
  }

  if (total <= 0) return
  const factor = descriptor.mass / total
  for (let index = 0; index < body.numColliders(); index++) {
    const collider = body.collider(index)
    collider.setDensity(collider.density() * factor)
  }

  body.recomputeMassPropertiesFromColliders()
}
