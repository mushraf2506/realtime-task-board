import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { QueuedOp } from '../types';

interface OfflineQueueDB extends DBSchema {
  ops: {
    key: string;
    value: QueuedOp;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'task-board-offline';
const STORE_NAME = 'ops';
let db: IDBPDatabase<OfflineQueueDB> | null = null;

async function getDB(): Promise<IDBPDatabase<OfflineQueueDB>> {
  if (db) return db;
  db = await openDB<OfflineQueueDB>(DB_NAME, 1, {
    upgrade(database) {
      const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('by-timestamp', 'timestamp');
    },
  });
  return db;
}

export async function enqueue(op: Omit<QueuedOp, 'id' | 'timestamp'>): Promise<QueuedOp> {
  const database = await getDB();
  const queued: QueuedOp = {
    ...op,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  };
  await database.put(STORE_NAME, queued);
  return queued;
}

export async function dequeue(id: string): Promise<void> {
  const database = await getDB();
  await database.delete(STORE_NAME, id);
}

export async function getAll(): Promise<QueuedOp[]> {
  const database = await getDB();
  return database.getAllFromIndex(STORE_NAME, 'by-timestamp');
}

export async function clearAll(): Promise<void> {
  const database = await getDB();
  await database.clear(STORE_NAME);
}

export async function count(): Promise<number> {
  const database = await getDB();
  return database.count(STORE_NAME);
}
