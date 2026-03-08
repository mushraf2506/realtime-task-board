import { usePresenceStore } from '../store/presenceStore';

export function PresenceBar() {
  const { me, users } = usePresenceStore();

  const allUsers = me
    ? [me, ...users.filter((u) => u.userId !== me.userId)]
    : users;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {allUsers.map((user, i) => (
        <div
          key={user.userId}
          title={`${user.username}${user.userId === me?.userId ? ' (you)' : ''}`}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: user.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '13px',
            fontWeight: 700,
            border: user.userId === me?.userId ? '2px solid #1d4ed8' : '2px solid white',
            cursor: 'default',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            marginLeft: i === 0 ? 0 : -8,
            zIndex: allUsers.length - i,
            position: 'relative',
          }}
        >
          {user.username.charAt(0).toUpperCase()}
        </div>
      ))}
      {allUsers.length > 0 && (
        <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '8px' }}>
          {allUsers.length} online
        </span>
      )}
    </div>
  );
}
