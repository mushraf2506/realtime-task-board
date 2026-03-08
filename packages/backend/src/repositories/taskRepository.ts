import { PoolClient } from 'pg';
import { query, withTransaction } from '../db/client';
import { Task, TaskRow, ColumnId } from '../types';

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    columnId: row.column_id,
    position: parseFloat(row.position),
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getAllTasks(): Promise<Task[]> {
  const rows = await query<TaskRow>(
    'SELECT * FROM tasks ORDER BY column_id, position ASC'
  );
  return rows.map(rowToTask);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const rows = await query<TaskRow>('SELECT * FROM tasks WHERE id = $1', [id]);
  return rows.length ? rowToTask(rows[0]) : null;
}

export async function getTasksByColumn(columnId: ColumnId): Promise<Task[]> {
  const rows = await query<TaskRow>(
    'SELECT * FROM tasks WHERE column_id = $1 ORDER BY position ASC',
    [columnId]
  );
  return rows.map(rowToTask);
}

/**
 * Acquire an advisory lock for position computation in a column.
 * Serialises all concurrent inserts/moves to the same column so they
 * each see the up-to-date last position (Scenario 3 race condition fix).
 * Released automatically at transaction end.
 */
async function lockColumnPositions(client: PoolClient, columnId: ColumnId): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`position_${columnId}`]);
}

/**
 * Create a task. Position is computed INSIDE a transaction serialised
 * by a column-level advisory lock.
 */
export async function createTask(
  title: string,
  description: string,
  columnId: ColumnId
): Promise<Task> {
  return withTransaction(async (client: PoolClient) => {
    await lockColumnPositions(client, columnId);

    const last = await client.query<{ position: string }>(
      `SELECT position FROM tasks WHERE column_id = $1 ORDER BY position DESC LIMIT 1`,
      [columnId]
    );
    const lastPos = last.rows.length > 0 ? parseFloat(last.rows[0].position) : 0;
    const position = lastPos + 1000;

    const result = await client.query<TaskRow>(
      `INSERT INTO tasks (title, description, column_id, position)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, description, columnId, position]
    );
    return rowToTask(result.rows[0]);
  });
}

/**
 * Update task fields (title/description only).
 * No version guard — field edits target different columns than move ops,
 * so concurrent move+edit is safe to apply unconditionally.
 * This preserves both changes in Scenario 1.
 */
export async function updateTaskFields(
  id: string,
  fields: { title?: string; description?: string }
): Promise<Task | null> {
  const sets: string[] = ['version = version + 1', 'updated_at = NOW()'];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (fields.title !== undefined) {
    sets.push(`title = $${paramIdx++}`);
    params.push(fields.title);
  }
  if (fields.description !== undefined) {
    sets.push(`description = $${paramIdx++}`);
    params.push(fields.description);
  }

  params.push(id);

  const rows = await query<TaskRow>(
    `UPDATE tasks SET ${sets.join(', ')}
     WHERE id = $${paramIdx}
     RETURNING *`,
    params
  );

  return rows.length ? rowToTask(rows[0]) : null;
}

/**
 * Move a task to a new column and position atomically.
 * Position is computed INSIDE the transaction to prevent concurrent moves
 * from getting the same position (Scenario 3 race condition).
 *
 * @param insertBeforeId - task to insert before, or null to append at end
 * Returns { task, wasConflict } where wasConflict=true means the version was stale.
 */
export async function moveTask(
  id: string,
  columnId: ColumnId,
  insertBeforeId: string | null,
  expectedVersion: number
): Promise<{ task: Task; wasConflict: boolean }> {
  return withTransaction(async (client: PoolClient) => {
    // Acquire advisory lock first — serialises ALL position computations for
    // this column. This prevents concurrent move+create getting the same position.
    await lockColumnPositions(client, columnId);

    // Lock the task being moved (detects concurrent move+move conflicts)
    const lockResult = await client.query(
      'SELECT * FROM tasks WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (!lockResult.rows.length) {
      throw new Error(`Task ${id} not found`);
    }

    const currentRow = lockResult.rows[0] as TaskRow;
    const wasConflict = currentRow.version !== expectedVersion;

    // Compute position from the current (post-lock) column state
    let position: number;

    if (insertBeforeId) {
      const rows = await client.query<{ id: string; position: string }>(
        `SELECT id, position FROM tasks WHERE column_id = $1 AND id != $2 ORDER BY position ASC`,
        [columnId, id]
      );
      const sorted = rows.rows.map(r => parseFloat(r.position));
      const beforeRow = rows.rows.find(r => r.id === insertBeforeId);

      if (!beforeRow) {
        // Target gone — append
        const last = sorted[sorted.length - 1] ?? 0;
        position = last + 1000;
      } else {
        const beforePos = parseFloat(beforeRow.position);
        const beforeIdx = sorted.indexOf(beforePos);
        const prevPos = beforeIdx > 0 ? sorted[beforeIdx - 1] : undefined;
        position = prevPos !== undefined ? (prevPos + beforePos) / 2 : beforePos / 2;
      }
    } else {
      // Append to end — advisory lock already ensures we see latest positions
      const last = await client.query<{ position: string }>(
        `SELECT position FROM tasks WHERE column_id = $1 AND id != $2 ORDER BY position DESC LIMIT 1`,
        [columnId, id]
      );
      const lastPos = last.rows.length > 0 ? parseFloat(last.rows[0].position) : 0;
      position = lastPos + 1000;
    }

    const updateResult = await client.query<TaskRow>(
      `UPDATE tasks
       SET column_id = $1, position = $2, version = version + 1, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [columnId, position, id]
    );

    return { task: rowToTask(updateResult.rows[0]), wasConflict };
  });
}

/**
 * Apply both a field update and a move in a single transaction.
 * Used for concurrent move+edit: preserve both changes.
 */
export async function moveAndUpdateTask(
  id: string,
  columnId: ColumnId,
  position: number,
  fields: { title?: string; description?: string }
): Promise<Task> {
  return withTransaction(async (client: PoolClient) => {
    const sets: string[] = [
      'column_id = $1',
      'position = $2',
      'version = version + 1',
      'updated_at = NOW()',
    ];
    const params: unknown[] = [columnId, position];
    let paramIdx = 3;

    if (fields.title !== undefined) {
      sets.push(`title = $${paramIdx++}`);
      params.push(fields.title);
    }
    if (fields.description !== undefined) {
      sets.push(`description = $${paramIdx++}`);
      params.push(fields.description);
    }

    params.push(id);
    const result = await client.query<TaskRow>(
      `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params
    );

    return rowToTask(result.rows[0]);
  });
}

export async function deleteTask(
  id: string
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    'DELETE FROM tasks WHERE id = $1 RETURNING id',
    [id]
  );
  return rows.length > 0;
}

/**
 * Rebalance positions for all tasks in a column.
 * Called when fractional positions get too close (gap < 1e-10).
 * Assigns evenly spaced positions 1000, 2000, 3000, …
 */
export async function rebalanceColumn(columnId: ColumnId): Promise<Task[]> {
  return withTransaction(async (client: PoolClient) => {
    const result = await client.query<TaskRow>(
      'SELECT * FROM tasks WHERE column_id = $1 ORDER BY position ASC FOR UPDATE',
      [columnId]
    );

    const updates: Promise<void>[] = result.rows.map((row, i) =>
      client
        .query('UPDATE tasks SET position = $1 WHERE id = $2', [(i + 1) * 1000, row.id])
        .then(() => undefined)
    );

    await Promise.all(updates);

    const refreshed = await client.query<TaskRow>(
      'SELECT * FROM tasks WHERE column_id = $1 ORDER BY position ASC',
      [columnId]
    );
    return refreshed.rows.map(rowToTask);
  });
}
