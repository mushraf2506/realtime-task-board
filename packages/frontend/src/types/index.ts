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

export const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

// Queued offline operation
export interface QueuedOp {
  id: string; // unique op id
  event: string;
  payload: Record<string, unknown>;
  timestamp: number;
}
