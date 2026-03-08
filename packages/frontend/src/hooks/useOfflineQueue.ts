import { create } from 'zustand';
import socket from '../lib/socket';
import * as offlineQueue from '../lib/offlineQueue';
import { QueuedOp } from '../types';

interface OfflineQueueState {
  isOnline: boolean;
  queuedCount: number;
  setOnline: (online: boolean) => void;
  setQueuedCount: (count: number) => void;
  enqueueOp: (event: string, payload: Record<string, unknown>) => Promise<void>;
  replayQueue: () => Promise<void>;
}

export const useOfflineQueue = create<OfflineQueueState>((set) => ({
  isOnline: true,
  queuedCount: 0,

  setOnline: (isOnline) => set({ isOnline }),
  setQueuedCount: (queuedCount) => set({ queuedCount }),

  enqueueOp: async (event, payload) => {
    await offlineQueue.enqueue({ event, payload });
    const count = await offlineQueue.count();
    set({ queuedCount: count });
  },

  replayQueue: async () => {
    const ops: QueuedOp[] = await offlineQueue.getAll();
    if (ops.length === 0) return;

    console.log(`Replaying ${ops.length} queued operations...`);

    for (const op of ops) {
      // Emit via socket — server applies same conflict resolution
      await new Promise<void>((resolve) => {
        socket.emit(op.event, op.payload, () => resolve());
        // Fallback: resolve after 2s if no ack
        setTimeout(resolve, 2000);
      });
      await offlineQueue.dequeue(op.id);
    }

    set({ queuedCount: 0 });
    console.log('Queue replay complete');
  },
}));

/**
 * Emit a socket event, or queue it if offline.
 */
export function emitOrQueue(
  event: string,
  payload: Record<string, unknown>
): void {
  const { isOnline, enqueueOp } = useOfflineQueue.getState();

  if (isOnline && socket.connected) {
    socket.emit(event, payload);
  } else {
    enqueueOp(event, payload);
  }
}
