import { type GraphicMesh3D } from '#/graphics/geometry/mesh3d.js'

import { required } from '../helpers/index.js'

const floatsPerVertex = 8
const bytesPerVertex = floatsPerVertex * 4

/** A three-dimensional mesh uploaded into a vertex array object. */
export interface GlMesh3D {
  readonly vertexArray: WebGLVertexArrayObject
  readonly vertexBuffer: WebGLBuffer
  readonly indexBuffer: WebGLBuffer
  readonly indexCount: number
}

/** Uploads and caches vertex arrays per three-dimensional mesh. */
export class GlMeshes3D {
  private readonly _gl: WebGL2RenderingContext
  private readonly _meshes: Map<GraphicMesh3D, GlMesh3D> = new Map<GraphicMesh3D, GlMesh3D>()

  public constructor(gl: WebGL2RenderingContext) {
    this._gl = gl
  }

  /** Number of cached meshes. */
  public get count(): number {
    return this._meshes.size
  }

  /** Returns the uploaded mesh, uploading it on first use. */
  public get(mesh: GraphicMesh3D): GlMesh3D {
    if (mesh.destroyed) {
      throw new Error('The mesh is destroyed.')
    }

    const cached = this._meshes.get(mesh)
    if (cached !== undefined) return cached

    const gl = this._gl
    const vertices = new Float32Array(mesh.vertices.length * floatsPerVertex)
    mesh.vertices.forEach((vertex, index) => {
      const offset = index * floatsPerVertex
      vertices[offset] = vertex.position.x
      vertices[offset + 1] = vertex.position.y
      vertices[offset + 2] = vertex.position.z
      vertices[offset + 3] = vertex.normal.x
      vertices[offset + 4] = vertex.normal.y
      vertices[offset + 5] = vertex.normal.z
      vertices[offset + 6] = vertex.textureCoordinate.x
      vertices[offset + 7] = vertex.textureCoordinate.y
    })

    const indices = new Uint32Array(mesh.indices)
    const vertexArray = required(gl.createVertexArray(), 'Unable to create a vertex array.')
    gl.bindVertexArray(vertexArray)
    const vertexBuffer = required(gl.createBuffer(), 'Unable to create a vertex buffer.')
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
    const indexBuffer = required(gl.createBuffer(), 'Unable to create an index buffer.')
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, bytesPerVertex, 0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, bytesPerVertex, 12)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, bytesPerVertex, 24)
    gl.bindVertexArray(null)

    const glMesh: GlMesh3D = {
      vertexArray,
      vertexBuffer,
      indexBuffer,
      indexCount: indices.length,
    }
    this._meshes.set(mesh, glMesh)

    return glMesh
  }

  /** Deletes one uploaded mesh. */
  public delete(mesh: GraphicMesh3D): void {
    const cached = this._meshes.get(mesh)
    if (cached === undefined) return
    this._meshes.delete(mesh)
    this.destroyMesh(cached)
  }

  /** Deletes every uploaded mesh. */
  public clear(): void {
    for (const mesh of this._meshes.values()) this.destroyMesh(mesh)
    this._meshes.clear()
  }

  private destroyMesh(mesh: GlMesh3D): void {
    const gl = this._gl
    gl.deleteVertexArray(mesh.vertexArray)
    gl.deleteBuffer(mesh.vertexBuffer)
    gl.deleteBuffer(mesh.indexBuffer)
  }
}
