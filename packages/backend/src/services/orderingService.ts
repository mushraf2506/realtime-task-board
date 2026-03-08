/**
 * Fractional Indexing — O(1) amortized per move operation.
 *
 * Each task stores a numeric `position`. Moving a task:
 * - Insert at start:   position = first.position / 2
 * - Insert at end:     position = last.position + 1000
 * - Insert between A and B: position = (A.position + B.position) / 2
 *
 * When the gap between two adjacent positions < MIN_GAP,
 * rebalanceColumn() must be called (O(n) but very rare).
 */

export const MIN_GAP = 1e-8;
export const INITIAL_STEP = 1000;

/**
 * Returns the midpoint between two positions.
 */
export function midpoint(a: number, b: number): number {
  return (a + b) / 2;
}

/**
 * Position for a task inserted before the first element.
 */
export function before(firstPosition: number): number {
  return firstPosition / 2;
}

/**
 * Position for a task appended after the last element.
 */
export function after(lastPosition: number): number {
  return lastPosition + INITIAL_STEP;
}

/**
 * Returns true if adjacent positions are too close and require rebalancing.
 */
export function needsRebalance(a: number, b: number): boolean {
  return Math.abs(b - a) < MIN_GAP;
}

/**
 * Given an ordered list of tasks in a column and the desired insertion index,
 * compute the new position value.
 *
 * @param tasks - Tasks sorted by position ascending
 * @param insertIndex - 0-based index where the task should appear after insert
 */
export function computeInsertPosition(
  tasks: Array<{ position: number }>,
  insertIndex: number
): number {
  if (tasks.length === 0) {
    return INITIAL_STEP;
  }

  if (insertIndex <= 0) {
    return before(tasks[0].position);
  }

  if (insertIndex >= tasks.length) {
    return after(tasks[tasks.length - 1].position);
  }

  const prev = tasks[insertIndex - 1].position;
  const next = tasks[insertIndex].position;

  return midpoint(prev, next);
}

/**
 * Check if inserting between two positions would require a rebalance.
 */
export function wouldRequireRebalance(
  prev: number | undefined,
  next: number | undefined
): boolean {
  if (prev === undefined || next === undefined) return false;
  return needsRebalance(prev, next);
}
