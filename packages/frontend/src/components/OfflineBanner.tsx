import { useOfflineQueue } from '../hooks/useOfflineQueue';

export function OfflineBanner() {
  const { isOnline, queuedCount } = useOfflineQueue();

  if (isOnline) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: '#f59e0b',
        color: '#1c1917',
        padding: '10px 20px',
        textAlign: 'center',
        fontWeight: 600,
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      <span>⚠️</span>
      <span>
        You&apos;re offline — changes will sync when you reconnect
        {queuedCount > 0 && (
          <span
            style={{
              marginLeft: '8px',
              background: '#1c1917',
              color: '#fef3c7',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '12px',
            }}
          >
            {queuedCount} queued
          </span>
        )}
      </span>
    </div>
  );
}
