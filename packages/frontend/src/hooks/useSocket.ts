import { useEffect, useRef } from 'react';
import socket from '../lib/socket';
import { useBoardStore } from '../store/boardStore';
import { usePresenceStore } from '../store/presenceStore';
import { Task, User } from '../types';
import { useOfflineQueue } from './useOfflineQueue';

interface ConflictMovePayload {
  task: Task;
  loserId: string;
  message: string;
}

export function useSocket(
  onConflict: (payload: ConflictMovePayload) => void
) {
  const { setTasks, reconcileTask, reconcileDelete } = useBoardStore();
  const { setMe, setUsers, addUser, removeUser, updateCursor } = usePresenceStore();
  const { setOnline, replayQueue } = useOfflineQueue();
  const hasJoined = useRef(false);

  useEffect(() => {
    // Join with a generated username if not already joined
    if (!hasJoined.current) {
      const userId = `user-${Math.random().toString(36).slice(2, 7)}`;
      const username = `User-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      const colors = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const me: User = { userId, username, color };
      setMe(me);

      socket.emit('presence:join', me);
      hasJoined.current = true;
    }

    // Board state (initial load + reconnect)
    socket.on('board:state', (tasks: Task[]) => {
      setTasks(tasks);
      replayQueue();
    });

    // Task events
    socket.on('task:created', (task: Task) => reconcileTask(task));
    socket.on('task:updated', (task: Task) => reconcileTask(task));
    socket.on('task:moved', (task: Task) => reconcileTask(task));
    socket.on('task:deleted', ({ id }: { id: string }) => reconcileDelete(id));
    socket.on('task:conflict_move', onConflict);

    // Stale version — server sends current task so client reconciles
    socket.on('task:stale', ({ current }: { current: Task }) => {
      if (current) reconcileTask(current);
    });

    // Presence events
    socket.on('presence:users', (users: User[]) => setUsers(users));
    socket.on('presence:joined', (user: User) => addUser(user));
    socket.on('presence:left', ({ userId }: { userId: string }) => removeUser(userId));
    socket.on('presence:cursor', ({ userId, columnId }: { userId: string; columnId?: string }) => {
      updateCursor(userId, columnId as any);
    });

    // Connection state
    socket.on('connect', () => {
      setOnline(true);
      // Re-join presence on reconnect
      const me = usePresenceStore.getState().me;
      if (me) socket.emit('presence:join', me);
    });

    socket.on('disconnect', () => {
      setOnline(false);
    });

    // Browser-level offline/online events fire instantly (e.g. system network off)
    const handleBrowserOffline = () => setOnline(false);
    const handleBrowserOnline = () => setOnline(true);
    window.addEventListener('offline', handleBrowserOffline);
    window.addEventListener('online', handleBrowserOnline);

    return () => {
      socket.off('board:state');
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:moved');
      socket.off('task:deleted');
      socket.off('task:conflict_move');
      socket.off('task:stale');
      socket.off('presence:users');
      socket.off('presence:joined');
      socket.off('presence:left');
      socket.off('presence:cursor');
      socket.off('connect');
      socket.off('disconnect');
      window.removeEventListener('offline', handleBrowserOffline);
      window.removeEventListener('online', handleBrowserOnline);
    };
  }, []);
}
