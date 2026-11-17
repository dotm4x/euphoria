/** Dimensionality of a simulation, which selects the matching backend. */
export enum Dimension {
  /** Planar simulation with two-dimensional shapes and transforms. */
  twoDimensional = '2d',
  /** Spatial simulation with three-dimensional shapes and transforms. */
  threeDimensional = '3d',
}
