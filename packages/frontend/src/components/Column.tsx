import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ColumnId, Task } from '../types';
import { TaskCard } from './TaskCard';
import { usePresenceStore } from '../store/presenceStore';
import { emitOrQueue } from '../hooks/useOfflineQueue';
import socket from '../lib/socket';

const COLUMN_COLORS: Record<ColumnId, { bg: string; accent: string; badge: string }> = {
  todo:        { bg: '#f8fafc', accent: '#64748b', badge: '#e2e8f0' },
  in_progress: { bg: '#fffbeb', accent: '#d97706', badge: '#fef3c7' },
  done:        { bg: '#f0fdf4', accent: '#16a34a', badge: '#dcfce7' },
};

interface Props {
  id: ColumnId;
  label: string;
  tasks: Task[];
}

export function Column({ id, label, tasks }: Props) {
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { me } = usePresenceStore();

  const { setNodeRef, isOver } = useDroppable({ id });

  const colors = COLUMN_COLORS[id];

  const handleAddTask = () => {
    if (!newTitle.trim()) return;

    emitOrQueue('task:create', {
      title: newTitle.trim(),
      description: '',
      columnId: id,
      clientTs: Date.now(),
      userId: me?.userId,
    });

    setNewTitle('');
    setIsAdding(false);
  };

  const handleColumnHover = () => {
    if (me) {
      socket.emit('presence:cursor', { userId: me.userId, columnId: id });
    }
  };

  return (
    <div
      onMouseEnter={handleColumnHover}
      style={{
        flex: 1,
        minWidth: 0,
        background: isOver ? '#eff6ff' : colors.bg,
        border: isOver ? '2px dashed #3b82f6' : '2px solid transparent',
        borderRadius: '12px',
        padding: '16px',
        transition: 'background 0.15s, border 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 700,
            color: colors.accent,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </h2>
        <span
          style={{
            background: colors.badge,
            color: colors.accent,
            borderRadius: '12px',
            padding: '2px 8px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      <div
        ref={setNodeRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minHeight: '60px',
          flex: 1,
        }}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>

      {/* Add task */}
      {isAdding ? (
        <div style={{ marginTop: '8px' }}>
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTask();
              if (e.key === 'Escape') setIsAdding(false);
            }}
            placeholder="Task title…"
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              marginBottom: '6px',
            }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleAddTask}
              disabled={!newTitle.trim()}
              style={{
                flex: 1, padding: '7px',
                background: '#3b82f6', color: 'white',
                border: 'none', borderRadius: '6px',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                opacity: newTitle.trim() ? 1 : 0.5,
              }}
            >
              Add
            </button>
            <button
              onClick={() => setIsAdding(false)}
              style={{
                padding: '7px 12px',
                background: 'white', color: '#6b7280',
                border: '1px solid #d1d5db', borderRadius: '6px',
                cursor: 'pointer', fontSize: '13px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          style={{
            marginTop: '8px',
            padding: '8px',
            background: 'transparent',
            border: '1px dashed #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#9ca3af',
            fontSize: '13px',
            width: '100%',
            textAlign: 'left',
          }}
        >
          + Add task
        </button>
      )}
    </div>
  );
}
