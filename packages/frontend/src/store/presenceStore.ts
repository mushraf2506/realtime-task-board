import { create } from 'zustand';
import { User, ColumnId } from '../types';

interface PresenceState {
  me: User | null;
  users: User[];

  setMe: (user: User) => void;
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  updateCursor: (userId: string, columnId?: ColumnId) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  me: null,
  users: [],

  setMe: (user) => set({ me: user }),

  setUsers: (users) => set({ users }),

  addUser: (user) =>
    set((state) => ({
      users: state.users.some((u) => u.userId === user.userId)
        ? state.users.map((u) => (u.userId === user.userId ? user : u))
        : [...state.users, user],
    })),

  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((u) => u.userId !== userId),
    })),

  updateCursor: (userId, columnId) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.userId === userId ? { ...u, activeColumn: columnId } : u
      ),
    })),
}));
