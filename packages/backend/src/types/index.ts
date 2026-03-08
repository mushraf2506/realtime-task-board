export type ColumnId = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  columnId: ColumnId;
  position: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  userId: string;
  username: string;
  color: string;
  activeColumn?: ColumnId;
}

// WebSocket event payloads — Client → Server
export interface CreateTaskPayload {
  title: string;
  description: string;
  columnId: ColumnId;
  position: number;
  clientTs: number;
}

export interface UpdateTaskPayload {
  id: string;
  title?: string;
  description?: string;
  version: number;
  clientTs: number;
}

export interface MoveTaskPayload {
  id: string;
  columnId: ColumnId;
  position: number;
  version: number;
  clientTs: number;
  userId: string;
}

export interface DeleteTaskPayload {
  id: string;
  version: number;
  clientTs: number;
}

export interface PresenceJoinPayload {
  userId: string;
  username: string;
  color: string;
}

export interface PresenceCursorPayload {
  userId: string;
  columnId?: ColumnId;
}

// Server → Client events
export interface ConflictMovePayload {
  task: Task;
  loserId: string;
  message: string;
}

// DB row shape
export interface TaskRow {
  id: string;
  title: string;
  description: string;
  column_id: ColumnId;
  position: string; // NUMERIC comes back as string from pg
  version: number;
  created_at: Date;
  updated_at: Date;
}
