/** How a body takes part in a simulation. */
export enum MotionType {
  /** Never moves on its own; contacts deflect dynamic bodies. */
  static = 'static',
  /** Moved by its owner and unaffected by forces, but pushes dynamic bodies. */
  kinematic = 'kinematic',
  /** Moved by the simulation through forces, impulses and contacts. */
  dynamic = 'dynamic',
}
