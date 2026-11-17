/** Command ordering applied by a rendering space. */
export enum RenderSortMode {
  /**
   * Draws commands in collection order, ordered by their draw order.
   *
   * The ordering is stable, so the sequence produced by containers such as
   * {@link YSortNode} is preserved. This is the default.
   */
  order = 'order',
  /** Draws commands from the farthest depth to the nearest, then by order. */
  depth = 'depth',
  /**
   * Draws commands by order and then by material, so commands that share a
   * material become adjacent and batch into fewer draw calls.
   *
   * Grouping by material reorders commands with the same order, so it can break
   * the sequence of containers that sort their own children.
   */
  batched = 'batched',
}
