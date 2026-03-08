import { useState, useEffect } from 'react';
import { Task } from '../types';

interface Props {
  task: Task;
  onSave: (title: string, description: string) => void;
  onClose: () => void;
}

export function TaskModal({ task, onSave, onClose }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave(title.trim(), description);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'white', borderRadius: '12px',
          padding: '24px', width: '480px', maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#111827' }}>
          Edit Task
        </h2>

        <label style={{ display: 'block', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Title</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            style={{
              display: 'block', width: '100%', marginTop: '4px',
              padding: '8px 12px', border: '1px solid #d1d5db',
              borderRadius: '6px', fontSize: '15px',
              boxSizing: 'border-box',
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '20px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{
              display: 'block', width: '100%', marginTop: '4px',
              padding: '8px 12px', border: '1px solid #d1d5db',
              borderRadius: '6px', fontSize: '14px', resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </label>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', border: '1px solid #d1d5db',
              borderRadius: '6px', background: 'white',
              cursor: 'pointer', fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            style={{
              padding: '8px 16px', border: 'none',
              borderRadius: '6px', background: '#3b82f6',
              color: 'white', cursor: 'pointer', fontSize: '14px',
              fontWeight: 600,
              opacity: title.trim() ? 1 : 0.5,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
