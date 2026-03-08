-- Real-time Collaborative Task Board - Initial Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  column_id   TEXT NOT NULL CHECK (column_id IN ('todo', 'in_progress', 'done')),
  position    NUMERIC(30, 15) NOT NULL,
  version     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_column_position ON tasks(column_id, position);

-- Seed initial tasks only if table is empty (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tasks LIMIT 1) THEN
    INSERT INTO tasks (title, description, column_id, position) VALUES
      ('Set up project repo', 'Initialize git, configure CI/CD pipeline', 'todo', 1000),
      ('Design database schema', 'Define tables, indexes, constraints', 'todo', 2000),
      ('Implement WebSocket server', 'Socket.IO with room management and presence', 'in_progress', 1000),
      ('Build drag-and-drop UI', 'Use dnd-kit for accessible DnD', 'in_progress', 2000),
      ('Write integration tests', 'Cover all 3 conflict scenarios', 'done', 1000);
  END IF;
END $$;
