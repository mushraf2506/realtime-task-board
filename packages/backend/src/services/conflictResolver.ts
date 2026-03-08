import { Task, ColumnId } from '../types';

export type ConflictResult =
  | { type: 'ok'; task: Task }
  | { type: 'move_conflict'; winner: Task; loserId: string; message: string }
  | { type: 'stale_edit'; current: Task };

/**
 * Scenario 1: Concurrent move + edit
 * User A moves Task X, User B edits Task X's title.
 * Resolution: Both changes are preserved — merge column/position from move
 * and title/description from edit.
 *
 * This is handled at the DB layer via moveAndUpdateTask(),
 * so no special conflict logic needed here. Both ops target different fields.
 */
export function isMoveEditConflict(
  pendingMove: { taskId: string; columnId: ColumnId; version: number },
  pendingEdit: { taskId: string; title?: string; description?: string; version: number }
): boolean {
  return pendingMove.taskId === pendingEdit.taskId;
}

/**
 * Scenario 2: Concurrent move + move
 * User A moves Task X to "in_progress" (clientTs=100)
 * User B moves Task X to "done" (clientTs=110)
 *
 * Resolution: Higher clientTs wins. Tie-break: lexicographically larger userId.
 * The losing user is notified via 'task:conflict_move' event.
 *
 * Returns: winnerId and loserId
 */
export function resolveMoveConflict(
  opA: { userId: string; clientTs: number; columnId: ColumnId; position: number },
  opB: { userId: string; clientTs: number; columnId: ColumnId; position: number }
): { winnerId: string; loserId: string } {
  // Higher timestamp wins
  if (opA.clientTs > opB.clientTs) {
    return { winnerId: opA.userId, loserId: opB.userId };
  }
  if (opB.clientTs > opA.clientTs) {
    return { winnerId: opB.userId, loserId: opA.userId };
  }
  // Tie-break: lexicographically larger userId wins (deterministic)
  if (opA.userId > opB.userId) {
    return { winnerId: opA.userId, loserId: opB.userId };
  }
  return { winnerId: opB.userId, loserId: opA.userId };
}

/**
 * Scenario 3: Concurrent reorder + add
 * User A reorders tasks in a column (changes one task's position).
 * User B adds a new task to the same column (gets its own new position).
 *
 * Resolution: No conflict — each op touches a different task or inserts a new task.
 * Fractional indexing means neither op needs to know about the other.
 * The final order will be consistent because positions are independent floats.
 *
 * This function validates that assumption: two ops conflict only if they
 * assign positions so close that floating-point precision is lost.
 */
export function detectPositionCollision(posA: number, posB: number): boolean {
  return Math.abs(posA - posB) < 1e-10;
}

/**
 * Build the conflict notification message for the losing user.
 */
export function buildConflictMessage(
  loserColumnId: ColumnId,
  winnerColumnId: ColumnId,
  winnerUsername: string
): string {
  const colName: Record<ColumnId, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
  };
  return `Your move to "${colName[loserColumnId]}" was overridden — ${winnerUsername} moved this task to "${colName[winnerColumnId]}" at the same time.`;
}
