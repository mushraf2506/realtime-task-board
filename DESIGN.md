# DESIGN.md — Conflict Resolution & Architecture

## 1. Conflict Resolution Strategy

The server is the single source of truth. All clients submit operations to the server, and the server applies them atomically and broadcasts the authoritative result. The client uses optimistic UI but always reconciles with the server's state.

### Scenario 1: Concurrent Move + Edit

**Problem:** User A moves Task X to "Done" while User B edits its title. Both arrive at the server with the same `version` number.

**Resolution:** These operations target **different fields** (`column_id`/`position` vs `title`/`description`). The server applies both independently using PostgreSQL row-level locking. The final state has the updated column _and_ the updated title — no data loss.

**Implementation:** `taskRepository.ts#moveAndUpdateTask()` — a single transaction that updates all changed fields atomically.

### Scenario 2: Concurrent Move + Move

**Problem:** User A moves Task X to "In Progress" (clientTs=100) while User B moves Task X to "Done" (clientTs=200).

**Resolution:** The server picks the **winner by Lamport timestamp** (highest `clientTs` wins). If timestamps tie, the lexicographically larger `userId` wins — this is deterministic and consistent across all nodes. The losing client receives a `task:conflict_move` event with a human-readable explanation and the authoritative task state.

**Implementation:** `conflictResolver.ts#resolveMoveConflict()` — pure function, easily testable.

**Why not last-write-wins by server arrival time?** Server arrival order depends on network latency and is not reproducible. Client timestamps capture the user's _intent time_, which is a better proxy for "most recent deliberate action."

### Scenario 3: Concurrent Reorder + Add

**Problem:** User A reorders tasks in a column (changes one task's `position`) while User B adds a new task to the same column.

**Resolution:** With fractional indexing, each operation assigns an independent position value without needing to know about other tasks. There is **no conflict** — User A's reorder sets one position, User B's insert computes a midpoint between its neighbors. The final order is determined purely by comparing floating-point values, which is consistent on all clients.

**Edge case:** If positions get so close that float precision is lost (gap < 1e-8), `rebalanceColumn()` assigns evenly-spaced integers. This is O(n) but happens at most O(log n) times per position, making it O(1) amortized.

---

## 2. Ordering Algorithm

**Approach: Fractional Indexing**

Each task stores a `NUMERIC(30,15)` `position` field. Moving a task to between positions A and B:
```
new_position = (A + B) / 2
```

**Complexity:**
- Insert / move: O(1) — only one row is updated
- Rebalance (rare): O(n) but amortized O(1) per operation
- Sort by position: O(n log n) — done in PostgreSQL with an index

**Why not array indices?** Shifting all subsequent positions is O(n) per move — unacceptable for large boards.

**Why not string-based fractional indexing?** Numeric DECIMAL has 15 decimal places of precision, giving ~50 halvings before rebalance is needed. String-based approaches (e.g., "a0b1z") add implementation complexity without practical benefit for this scale.

---

## 3. Optimistic UI

The client applies every action immediately to the local Zustand store, then emits the event to the server. When the server broadcasts the authoritative state:
- If it matches the optimistic state → no-op
- If it differs (conflict, stale version) → the store is updated with the server's version

The snapshot-before-optimistic-update is preserved in the event handler closure, enabling precise rollback without re-fetching the full board.

---

## 4. Offline Support

When the Socket.IO connection drops:
1. `useOfflineQueue` detects the `disconnect` event and sets `isOnline = false`
2. `OfflineBanner` renders with queued-op count
3. `emitOrQueue()` persists operations to IndexedDB instead of emitting

On reconnect:
1. Server emits `board:state` with current authoritative tasks
2. Client applies it (replacing any stale optimistic state)
3. `replayQueue()` emits each queued op via WebSocket in timestamp order
4. Server applies the same conflict resolution logic as live operations

**Why IndexedDB?** Persists across page refreshes, which in-memory queues don't. The `idb` library provides a clean Promise-based API.

---

## 5. WebSocket Architecture

Message handling is separated from business logic by design:

```
ws/handlers/taskHandlers.ts     ← parse + validate socket events
services/taskService.ts         ← business logic, conflict resolution
repositories/taskRepository.ts  ← atomic DB operations
```

`taskHandlers.ts` only knows about socket events and payloads. It delegates all logic to `taskService.ts`, which has no knowledge of WebSockets. This makes the service layer independently testable.

---

## 6. Trade-offs

| Decision | Alternative | Reason for choice |
|---|---|---|
| Server-authoritative + Lamport TS | CRDTs | CRDTs add significant complexity. Server authority is simpler and sufficient given always-connected assumption |
| Socket.IO | raw `ws` | Rooms, automatic reconnection, and fallback transport reduce boilerplate |
| PostgreSQL NUMERIC | string fractional index | Simpler, sufficient precision, native ordering in SQL |
| Zustand | Redux | Far less boilerplate; optimistic update + rollback is straightforward |
| IndexedDB for offline queue | in-memory | Survives page refresh; `idb` wrapper makes it ergonomic |
| No auth | Session auth | Assignment explicitly says random username on connect is sufficient |
