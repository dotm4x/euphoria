import { describe, expect, it } from 'vitest'

import {
  FixedJoint2D,
  FixedJoint3D,
  RevoluteJoint2D,
  RevoluteJoint3D,
  Vector2,
  Vector3,
} from '../../../../source/index.js'

describe('joint descriptors', () => {
  it('compares two-dimensional joints by value', () => {
    const options = {
      identifier: 'joint',
      body: 'a',
      other: 'b',
      anchor: new Vector2(1, 0),
      otherAnchor: new Vector2(0, 1),
    }
    const joint = new RevoluteJoint2D(options)

    expect(joint.equals(new RevoluteJoint2D(options))).toBe(true)
    expect(joint.equals(new RevoluteJoint2D({ ...options, anchor: new Vector2(2, 0) }))).toBe(false)
    expect(joint.equals(new FixedJoint2D(options))).toBe(false)
  })

  it('describes the hinge axis of a joint in space', () => {
    const options = { identifier: 'joint', body: 'a', other: 'b' }
    const joint = new RevoluteJoint3D({ ...options, axis: new Vector3(0, 1, 0) })
    const fixed = new FixedJoint3D(options)

    expect(joint.axis).toEqual(new Vector3(0, 1, 0))
    expect(joint.equals(new RevoluteJoint3D({ ...options, axis: new Vector3(0, 1, 0) }))).toBe(true)
    expect(joint.equals(new RevoluteJoint3D(options))).toBe(false)
    expect(fixed.anchor).toEqual(new Vector3(0, 0, 0))
    expect(fixed.equals(new FixedJoint3D(options))).toBe(true)
  })

  it('does not let jointed bodies collide unless asked to', () => {
    const options = { identifier: 'joint', body: 'a', other: 'b' }
    const joint = new FixedJoint2D(options)

    expect(joint.collideConnected).toBe(false)
    expect(joint.equals(new FixedJoint2D({ ...options, collideConnected: true }))).toBe(false)
    expect(new FixedJoint3D({ ...options, collideConnected: true }).collideConnected).toBe(true)
  })
})
