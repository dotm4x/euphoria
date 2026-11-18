import { type Camera, type Matrix4x4, type ReadOnlyStore, type Viewport } from '@euphoria/engine'

/** Camera that follows the camera selected by the active scene. */
export class CameraBinding implements Camera {
  private readonly _camera: ReadOnlyStore<Camera>

  public constructor(camera: ReadOnlyStore<Camera>) {
    this._camera = camera
  }

  public get view(): Matrix4x4 {
    return this._camera.value.view
  }

  public getProjection(viewport: Viewport): Matrix4x4 {
    return this._camera.value.getProjection(viewport)
  }
}
