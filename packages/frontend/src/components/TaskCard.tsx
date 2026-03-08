import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../types';
import { TaskModal } from './TaskModal';
import { useBoardStore } from '../store/boardStore';
import { usePresenceStore } from '../store/presenceStore';
import { emitOrQueue } from '../hooks/useOfflineQueue';

interface Props {
  task: Task;
}

export function TaskCard({ task }: Props) {
  const [showModal, setShowModal] = useState(false);
  const { updateTaskOptimistic } = useBoardStore();
  const { me } = usePresenceStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleSave = (title: string, description: string) => {
    // Optimistic update
    updateTaskOptimistic(task.id, { title, description });
    setShowModal(false);

    // Emit — server reconciles
    emitOrQueue('task:update', {
      id: task.id,
      title,
      description,
      version: task.version,
      clientTs: Date.now(),
      userId: me?.userId,
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${task.title}"?`)) return;
    emitOrQueue('task:delete', {
      id: task.id,
      version: task.version,
      clientTs: Date.now(),
    });
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onDoubleClick={() => setShowModal(true)}
        data-testid="task-card"
        aria-label={`Task: ${task.title}`}
      >
        <div
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px 14px',
            cursor: 'grab',
            userSelect: 'none',
            boxShadow: isDragging
              ? '0 8px 24px rgba(0,0,0,0.15)'
              : '0 1px 3px rgba(0,0,0,0.08)',
            position: 'relative',
            transition: 'box-shadow 0.15s',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: '14px',
                color: '#111827',
                lineHeight: 1.4,
                flex: 1,
              }}
            >
              {task.title}
            </p>
            <button
              onClick={handleDelete}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', color: '#9ca3af',
                fontSize: '16px', padding: '0 2px',
                lineHeight: 1, flexShrink: 0,
              }}
              aria-label="Delete task"
              title="Delete task"
            >
              ×
            </button>
          </div>
          {task.description && (
            <p
              style={{
                margin: '6px 0 0',
                fontSize: '12px',
                color: '#6b7280',
                lineHeight: 1.5,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {task.description}
            </p>
          )}
          <p
            style={{
              margin: '6px 0 0',
              fontSize: '11px',
              color: '#d1d5db',
            }}
          >
            Double-click to edit
          </p>
        </div>
      </div>

      {showModal && (
        <TaskModal
          task={task}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
