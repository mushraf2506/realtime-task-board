import { create } from 'zustand';
import { Task, ColumnId } from '../types';

interface BoardState {
  tasks: Task[];
  isLoading: boolean;

  // Set full board state (initial load / reconnect)
  setTasks: (tasks: Task[]) => void;
  setLoading: (loading: boolean) => void;

  // Optimistic mutations
  addTaskOptimistic: (task: Task) => void;
  updateTaskOptimistic: (id: string, fields: Partial<Task>) => void;
  moveTaskOptimistic: (id: string, columnId: ColumnId, position: number) => void;
  deleteTaskOptimistic: (id: string) => void;

  // Server reconciliation: replace a single task with authoritative version
  reconcileTask: (task: Task) => void;
  reconcileDelete: (id: string) => void;

  // Rollback optimistic change by restoring a snapshot
  rollbackTask: (snapshot: Task) => void;

  // Helpers
  getTasksByColumn: (columnId: ColumnId) => Task[];
}

export const useBoardStore = create<BoardState>((set, get) => ({
  tasks: [],
  isLoading: true,

  setTasks: (tasks) => set({ tasks, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  addTaskOptimistic: (task) =>
    set((state) => ({ tasks: [...state.tasks, task] })),

  updateTaskOptimistic: (id, fields) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...fields } : t)),
    })),

  moveTaskOptimistic: (id, columnId, position) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, columnId, position } : t
      ),
    })),

  deleteTaskOptimistic: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

  reconcileTask: (task) =>
    set((state) => {
      const exists = state.tasks.some((t) => t.id === task.id);
      if (exists) {
        return { tasks: state.tasks.map((t) => (t.id === task.id ? task : t)) };
      }
      return { tasks: [...state.tasks, task] };
    }),

  reconcileDelete: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

  rollbackTask: (snapshot) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === snapshot.id ? snapshot : t)),
    })),

  getTasksByColumn: (columnId) => {
    return get()
      .tasks.filter((t) => t.columnId === columnId)
      .sort((a, b) => a.position - b.position);
  },
}));
