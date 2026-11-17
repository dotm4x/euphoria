import { Vector2 } from '#/math/primitives/vectors/vector2.js'
import { Vector3 } from '#/math/primitives/vectors/vector3.js'

import { GraphicMesh3D } from './mesh3d.js'
import { Vertex3D } from './vertex3d.js'

/**
 * Creates a box centered on the origin.
 *
 * Faces are built with their own vertices so each one keeps a flat normal.
 *
 * @param size - Width, height and depth of the box. Defaults to one unit.
 * @returns A box with twenty-four vertices and thirty-six indices.
 * @throws {@link RangeError} If a size component is not positive.
 */
export function createBoxMesh(size: Vector3 = new Vector3(1, 1, 1)): GraphicMesh3D {
  if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
    throw new RangeError('Box sizes must be greater than zero.')
  }

  const half = new Vector3(size.x / 2, size.y / 2, size.z / 2)
  const faces: readonly {
    readonly normal: Vector3
    readonly corners: readonly Vector3[]
  }[] = [
    {
      normal: new Vector3(0, 0, 1),
      corners: [
        new Vector3(-half.x, -half.y, half.z),
        new Vector3(half.x, -half.y, half.z),
        new Vector3(half.x, half.y, half.z),
        new Vector3(-half.x, half.y, half.z),
      ],
    },
    {
      normal: new Vector3(0, 0, -1),
      corners: [
        new Vector3(half.x, -half.y, -half.z),
        new Vector3(-half.x, -half.y, -half.z),
        new Vector3(-half.x, half.y, -half.z),
        new Vector3(half.x, half.y, -half.z),
      ],
    },
    {
      normal: new Vector3(1, 0, 0),
      corners: [
        new Vector3(half.x, -half.y, half.z),
        new Vector3(half.x, -half.y, -half.z),
        new Vector3(half.x, half.y, -half.z),
        new Vector3(half.x, half.y, half.z),
      ],
    },
    {
      normal: new Vector3(-1, 0, 0),
      corners: [
        new Vector3(-half.x, -half.y, -half.z),
        new Vector3(-half.x, -half.y, half.z),
        new Vector3(-half.x, half.y, half.z),
        new Vector3(-half.x, half.y, -half.z),
      ],
    },
    {
      normal: new Vector3(0, 1, 0),
      corners: [
        new Vector3(-half.x, half.y, half.z),
        new Vector3(half.x, half.y, half.z),
        new Vector3(half.x, half.y, -half.z),
        new Vector3(-half.x, half.y, -half.z),
      ],
    },
    {
      normal: new Vector3(0, -1, 0),
      corners: [
        new Vector3(-half.x, -half.y, -half.z),
        new Vector3(half.x, -half.y, -half.z),
        new Vector3(half.x, -half.y, half.z),
        new Vector3(-half.x, -half.y, half.z),
      ],
    },
  ]

  const vertices: Vertex3D[] = []
  const indices: number[] = []
  for (const face of faces) {
    const base = vertices.length
    const coordinates = [new Vector2(0, 1), new Vector2(1, 1), new Vector2(1, 0), new Vector2(0, 0)]
    face.corners.forEach((corner, index) => {
      vertices.push(new Vertex3D(corner, face.normal, coordinates[index] ?? new Vector2(0, 0)))
    })
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }

  return new GraphicMesh3D(vertices, indices)
}

/**
 * Creates a horizontal plane centered on the origin and facing up.
 *
 * @param size - Width and depth of the plane. Defaults to one unit.
 * @returns A plane with four vertices and six indices.
 * @throws {@link RangeError} If a size component is not positive.
 */
export function createPlaneMesh(size: Vector2 = new Vector2(1, 1)): GraphicMesh3D {
  if (size.x <= 0 || size.y <= 0) {
    throw new RangeError('Plane sizes must be greater than zero.')
  }

  const halfX = size.x / 2
  const halfZ = size.y / 2
  const normal = new Vector3(0, 1, 0)

  return new GraphicMesh3D(
    [
      new Vertex3D(new Vector3(-halfX, 0, halfZ), normal, new Vector2(0, 0)),
      new Vertex3D(new Vector3(halfX, 0, halfZ), normal, new Vector2(1, 0)),
      new Vertex3D(new Vector3(halfX, 0, -halfZ), normal, new Vector2(1, 1)),
      new Vertex3D(new Vector3(-halfX, 0, -halfZ), normal, new Vector2(0, 1)),
    ],
    [0, 1, 2, 0, 2, 3],
  )
}

/**
 * Creates a UV sphere centered on the origin.
 *
 * @param radius - Radius of the sphere. Defaults to one unit.
 * @param rings - Latitude divisions, at least two. Defaults to sixteen.
 * @param segments - Longitude divisions, at least three. Defaults to thirty-two.
 * @returns A sphere with smooth normals.
 * @throws {@link RangeError} If a parameter is outside its valid range.
 */
export function createSphereMesh(
  radius: number = 1,
  rings: number = 16,
  segments: number = 32,
): GraphicMesh3D {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError('Sphere radii must be greater than zero.')
  }

  if (!Number.isInteger(rings) || rings < 2 || !Number.isInteger(segments) || segments < 3) {
    throw new RangeError('Spheres require at least two rings and three segments.')
  }

  const vertices: Vertex3D[] = []
  const indices: number[] = []
  for (let ring = 0; ring <= rings; ring++) {
    const latitude = (ring / rings) * Math.PI
    const y = Math.cos(latitude)
    const ringRadius = Math.sin(latitude)
    for (let segment = 0; segment <= segments; segment++) {
      const longitude = (segment / segments) * Math.PI * 2
      const normal = new Vector3(
        Math.cos(longitude) * ringRadius,
        y,
        Math.sin(longitude) * ringRadius,
      )
      vertices.push(
        new Vertex3D(
          new Vector3(normal.x * radius, normal.y * radius, normal.z * radius),
          normal,
          new Vector2(segment / segments, ring / rings),
        ),
      )
    }
  }

  for (let ring = 0; ring < rings; ring++) {
    for (let segment = 0; segment < segments; segment++) {
      const first = ring * (segments + 1) + segment
      const second = first + segments + 1
      indices.push(first, second, first + 1, first + 1, second, second + 1)
    }
  }

  return new GraphicMesh3D(vertices, indices)
}
