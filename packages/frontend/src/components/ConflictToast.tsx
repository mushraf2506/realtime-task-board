import { useState, useEffect, useCallback } from 'react';

interface ToastMessage {
  id: string;
  message: string;
}

let globalAddToast: ((message: string) => void) | null = null;

export function showConflictToast(message: string) {
  globalAddToast?.(message);
}

export function ConflictToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  useEffect(() => {
    globalAddToast = addToast;
    return () => { globalAddToast = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: '#1e293b',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            maxWidth: '360px',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            borderLeft: '4px solid #f59e0b',
            animation: 'slideIn 0.2s ease',
          }}
        >
          <strong style={{ display: 'block', marginBottom: '4px', color: '#fbbf24' }}>
            ⚡ Move Conflict
          </strong>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
