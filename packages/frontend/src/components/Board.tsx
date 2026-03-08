import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState } from 'react';
import { ColumnId, COLUMNS, Task } from '../types';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { useBoardStore } from '../store/boardStore';
import { usePresenceStore } from '../store/presenceStore';
import { emitOrQueue } from '../hooks/useOfflineQueue';
import { computeInsertPosition } from '../lib/fractionalIndex';

export function Board() {
  const { tasks, moveTaskOptimistic, getTasksByColumn } = useBoardStore();
  const { me } = usePresenceStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // If dragging over a column container (not a task)
    const overIsColumn = COLUMNS.some((c) => c.id === over.id);
    if (overIsColumn && activeTask.columnId !== over.id) {
      moveTaskOptimistic(
        activeTask.id,
        over.id as ColumnId,
        activeTask.position
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const dragged = tasks.find((t) => t.id === active.id);
    if (!dragged) return;

    // Determine target column and insertion point
    const overIsColumn = COLUMNS.some((c) => c.id === over.id);
    const overTask = tasks.find((t) => t.id === over.id);

    const targetColumnId: ColumnId = overIsColumn
      ? (over.id as ColumnId)
      : (overTask?.columnId ?? dragged.columnId);

    const insertBeforeId = overIsColumn ? null : over.id as string;

    // Compute optimistic position
    const columnTasks = getTasksByColumn(targetColumnId).filter(
      (t) => t.id !== dragged.id
    );
    let insertIndex = columnTasks.length;
    if (insertBeforeId) {
      const idx = columnTasks.findIndex((t) => t.id === insertBeforeId);
      if (idx !== -1) insertIndex = idx;
    }

    // Optimistic UI update
    const newPosition = computeInsertPosition(columnTasks, insertIndex);
    moveTaskOptimistic(dragged.id, targetColumnId, newPosition);

    // Emit to server (server is authoritative)
    emitOrQueue('task:move', {
      id: dragged.id,
      columnId: targetColumnId,
      insertBeforeId,
      version: dragged.version,
      clientTs: Date.now(),
      userId: me?.userId ?? '',
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          display: 'flex',
          gap: '16px',
          flex: 1,
          overflow: 'auto',
          padding: '0 24px 24px',
        }}
      >
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            tasks={getTasksByColumn(col.id)}
          />
        ))}
      </div>

      {/* Drag overlay — the floating card while dragging */}
      <DragOverlay>
        {activeTask && (
          <div style={{ opacity: 0.9, transform: 'rotate(2deg)' }}>
            <TaskCard task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
