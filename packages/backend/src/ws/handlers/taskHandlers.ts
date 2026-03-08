import { Server as IOServer, Socket } from 'socket.io';
import * as taskService from '../../services/taskService';
import {
  CreateTaskPayload,
  UpdateTaskPayload,
  MoveTaskPayload,
  DeleteTaskPayload,
} from '../../types';

export function registerTaskHandlers(io: IOServer, socket: Socket): void {
  /**
   * Create a new task. Position is computed server-side.
   */
  socket.on('task:create', async (payload: CreateTaskPayload) => {
    try {
      const task = await taskService.createTask({
        title: payload.title.trim(),
        description: payload.description || '',
        columnId: payload.columnId,
      });
      // Broadcast to ALL clients (including sender) so optimistic UI reconciles
      io.emit('task:created', task);
    } catch (err) {
      socket.emit('task:error', { event: 'task:create', message: String(err) });
    }
  });

  /**
   * Update task title/description with optimistic locking.
   */
  socket.on('task:update', async (payload: UpdateTaskPayload) => {
    try {
      const fields: { title?: string; description?: string } = {};
      if (payload.title !== undefined) fields.title = payload.title.trim();
      if (payload.description !== undefined) fields.description = payload.description;

      const task = await taskService.updateTask(payload.id, fields);

      if (!task) {
        socket.emit('task:error', { event: 'task:update', message: 'Task not found' });
        return;
      }

      io.emit('task:updated', task);
    } catch (err) {
      socket.emit('task:error', { event: 'task:update', message: String(err) });
    }
  });

  /**
   * Move a task to a new column/position.
   * Handles conflict resolution for concurrent moves.
   */
  socket.on('task:move', async (payload: MoveTaskPayload) => {
    try {
      const result = await taskService.moveTask({
        taskId: payload.id,
        columnId: payload.columnId,
        insertBeforeId: (payload as any).insertBeforeId ?? null,
        version: payload.version,
        clientTs: payload.clientTs,
        userId: payload.userId || socket.id,
      });

      // Broadcast the authoritative state to all clients
      io.emit('task:moved', result.task);

      // Notify the loser if there was a conflict
      if (result.conflict) {
        socket.emit('task:conflict_move', {
          task: result.task,
          loserId: result.conflict.loserId,
          message: result.conflict.message,
        });
      }
    } catch (err) {
      socket.emit('task:error', { event: 'task:move', message: String(err) });
    }
  });

  /**
   * Delete a task.
   */
  socket.on('task:delete', async (payload: DeleteTaskPayload) => {
    try {
      const deleted = await taskService.deleteTask(payload.id);
      if (deleted) {
        io.emit('task:deleted', { id: payload.id });
      } else {
        socket.emit('task:error', { event: 'task:delete', message: 'Task not found' });
      }
    } catch (err) {
      socket.emit('task:error', { event: 'task:delete', message: String(err) });
    }
  });
}
