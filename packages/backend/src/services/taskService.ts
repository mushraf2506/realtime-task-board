import * as repo from '../repositories/taskRepository';
import { rebalanceColumn } from '../repositories/taskRepository';
import { wouldRequireRebalance } from './orderingService';
import { resolveMoveConflict, buildConflictMessage } from './conflictResolver';
import { Task, ColumnId } from '../types';

export interface CreateTaskInput {
  title: string;
  description: string;
  columnId: ColumnId;
}

export interface MoveTaskInput {
  taskId: string;
  columnId: ColumnId;
  insertBeforeId: string | null;
  version: number;
  clientTs: number;
  userId: string;
}

export interface PendingMove {
  taskId: string;
  userId: string;
  clientTs: number;
  columnId: ColumnId;
  insertBeforeId: string | null;
  version: number;
}

/**
 * In-flight moves keyed by taskId.
 * Catches two moves that arrive before either commits.
 */
const pendingMoves = new Map<string, PendingMove>();

export async function createTask(input: CreateTaskInput): Promise<Task> {
  // Position is computed atomically inside repo.createTask transaction
  return repo.createTask(input.title, input.description, input.columnId);
}

export async function updateTask(
  id: string,
  fields: { title?: string; description?: string }
): Promise<Task | null> {
  return repo.updateTaskFields(id, fields);
}

export interface MoveResult {
  task: Task;
  conflict?: { loserId: string; message: string };
}

export async function moveTask(input: MoveTaskInput): Promise<MoveResult> {
  const { taskId, columnId, insertBeforeId, version, clientTs, userId } = input;

  // Check if rebalance is needed (only for insert-between case)
  if (insertBeforeId) {
    const columnTasks = await repo.getTasksByColumn(columnId);
    const otherTasks = columnTasks.filter((t) => t.id !== taskId);
    const idx = otherTasks.findIndex((t) => t.id === insertBeforeId);
    if (idx > 0) {
      const prev = otherTasks[idx - 1].position;
      const next = otherTasks[idx].position;
      if (wouldRequireRebalance(prev, next)) {
        await rebalanceColumn(columnId);
      }
    }
  }

  // Check for in-flight concurrent move (both arrived before either committed)
  const existing = pendingMoves.get(taskId);
  if (existing) {
    const { winnerId, loserId } = resolveMoveConflict(
      { userId: existing.userId, clientTs: existing.clientTs, columnId: existing.columnId, position: 0 },
      { userId, clientTs, columnId, position: 0 }
    );

    if (loserId === userId) {
      // This op loses — let the already-pending op win
      pendingMoves.delete(taskId);
      const { task } = await repo.moveTask(taskId, existing.columnId, existing.insertBeforeId ?? null, version);
      const msg = buildConflictMessage(columnId, existing.columnId, existing.userId);
      return { task, conflict: { loserId, message: msg } };
    }
    pendingMoves.delete(taskId);
  }

  pendingMoves.set(taskId, { taskId, userId, clientTs, columnId, insertBeforeId, version });

  // Position is computed atomically inside the transaction
  const { task, wasConflict } = await repo.moveTask(taskId, columnId, insertBeforeId, version);
  pendingMoves.delete(taskId);

  if (wasConflict) {
    const msg = buildConflictMessage(columnId, task.columnId, 'another user');
    return { task, conflict: { loserId: userId, message: msg } };
  }

  return { task };
}

export async function deleteTask(id: string): Promise<boolean> {
  return repo.deleteTask(id);
}

export async function getAllTasks(): Promise<Task[]> {
  return repo.getAllTasks();
}
