import type * as Rapier from '@dimforge/rapier3d-compat'

import { Vector3 } from '#/math/primitives/vectors/vector3.js'
import { type BodyDescriptor3D } from '#/physics/descriptors/3d/body.js'
import { type ColliderDescriptor3D } from '#/physics/descriptors/3d/collider.js'
import {
  FixedJoint3D,
  type JointDescriptor3D,
  RevoluteJoint3D,
} from '#/physics/descriptors/3d/joint.js'
import { MotionType } from '#/physics/primitives/motion.js'
import { type Shape3D } from '#/physics/primitives/shape.js'

/**
 * Converts a body descriptor into a rigid body description.
 *
 * @param rapier - The Rapier module in use.
 * @param descriptor - The body to describe.
 * @returns A rigid body description owned by the caller.
 */
export function toRigidBodyDesc(
  rapier: typeof Rapier,
  descriptor: BodyDescriptor3D,
): Rapier.RigidBodyDesc {
  const description = motionDescription(rapier, descriptor.motion)
  description.setTranslation(descriptor.position.x, descriptor.position.y, descriptor.position.z)
  description.setRotation(eulerToRotation(descriptor.rotation))
  description.setLinearDamping(descriptor.linearDamping)
  description.setAngularDamping(descriptor.angularDamping)
  description.setGravityScale(descriptor.gravityScale)
  description.setCcdEnabled(descriptor.ccd)
  description.setCanSleep(descriptor.sleepAllowed)
  const velocity = descriptor.linearVelocity
  description.setLinvel(velocity.x, velocity.y, velocity.z)
  const angular = descriptor.angularVelocity
  description.setAngvel({ x: angular.x, y: angular.y, z: angular.z })

  return description
}

/**
 * Converts a collider descriptor into a collider description.
 *
 * @param rapier - The Rapier module in use.
 * @param descriptor - The collider to describe.
 * @returns A collider description owned by the caller.
 * @throws {@link Error} If a convex shape has no hull.
 */
export function toColliderDesc(
  rapier: typeof Rapier,
  descriptor: ColliderDescriptor3D,
): Rapier.ColliderDesc {
  const description = shapeDescription(rapier, descriptor.shape)
  description.setTranslation(descriptor.offset.x, descriptor.offset.y, descriptor.offset.z)
  description.setRotation(eulerToRotation(descriptor.rotation))
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
 * Converts a joint descriptor into joint data.
 *
 * @param rapier - The Rapier module in use.
 * @param descriptor - The joint to describe.
 * @returns The joint data owned by the caller.
 */
export function toJointData(
  rapier: typeof Rapier,
  descriptor: JointDescriptor3D,
): Rapier.JointData {
  if (descriptor instanceof FixedJoint3D) {
    return rapier.JointData.fixed(
      { x: descriptor.anchor.x, y: descriptor.anchor.y, z: descriptor.anchor.z },
      identityRotation(),
      { x: descriptor.otherAnchor.x, y: descriptor.otherAnchor.y, z: descriptor.otherAnchor.z },
      identityRotation(),
    )
  }

  if (descriptor instanceof RevoluteJoint3D) {
    return rapier.JointData.revolute(
      { x: descriptor.anchor.x, y: descriptor.anchor.y, z: descriptor.anchor.z },
      { x: descriptor.otherAnchor.x, y: descriptor.otherAnchor.y, z: descriptor.otherAnchor.z },
      { x: descriptor.axis.x, y: descriptor.axis.y, z: descriptor.axis.z },
    )
  }

  throw new Error('Unsupported joint type.')
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

/**
 * Converts roll, pitch and yaw angles into a rotation.
 *
 * The angles match the rotation order of three-dimensional nodes: yaw around
 * Y, then pitch around X and finally roll around Z.
 *
 * @param rotation - Rotation as roll, pitch and yaw, in radians.
 * @returns The matching quaternion.
 */
export function eulerToRotation(rotation: Vector3): Rapier.Rotation {
  const yaw = quaternion(0, Math.sin(rotation.y * 0.5), 0, Math.cos(rotation.y * 0.5))
  const pitch = quaternion(Math.sin(rotation.x * 0.5), 0, 0, Math.cos(rotation.x * 0.5))
  const roll = quaternion(0, 0, Math.sin(rotation.z * 0.5), Math.cos(rotation.z * 0.5))

  return multiply(multiply(yaw, pitch), roll)
}

/**
 * Converts a rotation into roll, pitch and yaw angles.
 *
 * The result matches the rotation order of three-dimensional nodes. Near a
 * pitch of a quarter turn the roll is folded into the yaw, which is the only
 * decomposition available at that orientation.
 *
 * @param rotation - The quaternion to decompose.
 * @returns The matching rotation as roll, pitch and yaw, in radians.
 */
export function rotationToEuler(rotation: Rapier.Rotation): Vector3 {
  const { x, y, z, w } = rotation
  const m23 = 2 * (y * z - x * w)
  const m13 = 2 * (x * z + y * w)
  const m33 = 1 - 2 * (x * x + y * y)
  const m21 = 2 * (x * y + z * w)
  const m22 = 1 - 2 * (x * x + z * z)
  const m31 = 2 * (x * z - y * w)
  const m11 = 1 - 2 * (y * y + z * z)
  const pitch = Math.asin(Math.min(1, Math.max(-1, -m23)))
  if (Math.abs(m23) > 0.999_999) {
    return new Vector3(pitch, Math.atan2(-m31, m11), 0)
  }

  return new Vector3(pitch, Math.atan2(m13, m33), Math.atan2(m21, m22))
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

function identityRotation(): Rapier.Rotation {
  return { x: 0, y: 0, z: 0, w: 1 }
}

function quaternion(x: number, y: number, z: number, w: number): Rapier.Rotation {
  return { x, y, z, w }
}

function multiply(left: Rapier.Rotation, right: Rapier.Rotation): Rapier.Rotation {
  return {
    x: left.w * right.x + left.x * right.w + left.y * right.z - left.z * right.y,
    y: left.w * right.y - left.x * right.z + left.y * right.w + left.z * right.x,
    z: left.w * right.z + left.x * right.y - left.y * right.x + left.z * right.w,
    w: left.w * right.w - left.x * right.x - left.y * right.y - left.z * right.z,
  }
}

function shapeDescription(rapier: typeof Rapier, shape: Shape3D): Rapier.ColliderDesc {
  switch (shape.kind) {
    case 'box': {
      const { x, y, z } = shape.halfExtents

      return rapier.ColliderDesc.cuboid(x, y, z)
    }

    case 'capsule': {
      return rapier.ColliderDesc.capsule(shape.halfHeight, shape.radius)
    }

    case 'convex': {
      const points = new Float32Array(shape.points.length * 3)
      for (const [index, point] of shape.points.entries()) {
        points[index * 3] = point.x
        points[index * 3 + 1] = point.y
        points[index * 3 + 2] = point.z
      }

      const description = rapier.ColliderDesc.convexHull(points)
      if (description === null) {
        throw new Error('A convex collider requires at least four non coplanar vertices.')
      }

      return description
    }

    case 'sphere': {
      return rapier.ColliderDesc.ball(shape.radius)
    }
  }

  throw new Error('Unsupported shape kind.')
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
export function applyMassProperties(body: Rapier.RigidBody, descriptor: BodyDescriptor3D): void {
  const { x, y, z } = descriptor.inertia
  const explicitInertia = x > 0 || y > 0 || z > 0
  if (descriptor.mass <= 0) {
    if (explicitInertia) {
      throw new Error('An explicit inertia requires an explicit body mass.')
    }

    return
  }

  if (explicitInertia) {
    for (let index = 0; index < body.numColliders(); index++) {
      body.collider(index).setDensity(0)
    }

    body.setAdditionalMassProperties(
      descriptor.mass,
      { x: 0, y: 0, z: 0 },
      { x, y, z },
      identityRotation(),
      true,
    )
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
