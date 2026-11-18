import { type Vector3 } from '#/math/primitives/vectors/vector3.js'

const silence = 0

/**
 * Calculates the distance between two points, ignoring the vertical axis.
 *
 * @param position - Position of the voice.
 * @param listener - Position of the listener.
 * @returns Distance on the plane, in world units.
 */
export function planarDistance(position: Vector3, listener: Vector3): number {
  return Math.hypot(position.x - listener.x, position.y - listener.y)
}

/**
 * Calculates the distance between two points in space.
 *
 * @param position - Position of the voice.
 * @param listener - Position of the listener.
 * @returns Distance in world units.
 */
export function spatialDistance(position: Vector3, listener: Vector3): number {
  return position.distanceTo(listener)
}

/**
 * Calculates the stereo pan of a voice seen from the listener.
 *
 * The pan is the projection of the voice over the right axis of the listener,
 * so a voice to the right is heard on the right. It does not depend on the
 * distance, which the attenuation handles.
 *
 * @param position - Position of the voice.
 * @param listener - Position of the listener.
 * @param forward - Direction the listener faces.
 * @param up - Up axis of the listener.
 * @returns Pan from `-1` (left) to `1` (right).
 */
export function panFor(
  position: Vector3,
  listener: Vector3,
  forward: Vector3,
  up: Vector3,
): number {
  const direction = position.subtract(listener)
  if (direction.magnitude <= Number.EPSILON) return silence

  const right = forward.cross(up)
  if (right.magnitude <= Number.EPSILON) return silence

  const pan = direction.normalize().dot(right.normalize())

  return Math.min(1, Math.max(-1, pan))
}
