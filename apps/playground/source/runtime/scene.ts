import {
  type Camera,
  type JointDescriptor2D,
  type Node,
  type SimulationSpace,
} from '@euphoria/engine'

/** What a story hands the runtime. */
export interface StoryScene {
  /** Scene whose ownership transfers to the engine. */
  readonly node: Node
  /** Camera the renderer draws the scene with. */
  readonly camera: Camera
  /** Joints the two-dimensional simulation must constrain. */
  readonly joints2D?: Iterable<JointDescriptor2D> | undefined
  /** Binds a simulation space to the scene, so it can query it. */
  readonly attach?: ((space: SimulationSpace) => void) | undefined
  /** Extra values shown next to the engine metrics. */
  readonly readouts?: (() => Iterable<readonly [string, string]>) | undefined
  /** Scene description published with the render benchmark. */
  readonly benchmark?:
    { readonly mode: string; readonly count: number; readonly nodes: number } | undefined
}
