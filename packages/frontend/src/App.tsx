import { Board } from './components/Board';
import { OfflineBanner } from './components/OfflineBanner';
import { PresenceBar } from './components/PresenceBar';
import { ConflictToastContainer, showConflictToast } from './components/ConflictToast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useSocket } from './hooks/useSocket';
import { useBoardStore } from './store/boardStore';

export default function App() {
  const { isLoading } = useBoardStore();

  useSocket((payload) => {
    showConflictToast(payload.message);
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <OfflineBanner />

      {/* Header */}
      <header
        style={{
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>📋</span>
          <h1
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 700,
              color: '#111827',
            }}
          >
            Collaborative Task Board
          </h1>
        </div>
        <PresenceBar />
      </header>

      {/* Board */}
      {isLoading ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: '16px',
          }}
        >
          Loading board…
        </div>
      ) : (
        <ErrorBoundary>
          <main
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              paddingTop: '24px',
            }}
          >
            <Board />
          </main>
        </ErrorBoundary>
      )}

      <ConflictToastContainer />
    </div>
  );
}
