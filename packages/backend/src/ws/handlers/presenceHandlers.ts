import { Server as IOServer, Socket } from 'socket.io';
import { User, PresenceJoinPayload, PresenceCursorPayload } from '../../types';

export function registerPresenceHandlers(
  io: IOServer,
  socket: Socket,
  connectedUsers: Map<string, User>,
  socketToUserId: Map<string, string>
): void {
  socket.on('presence:join', (payload: PresenceJoinPayload) => {
    const user: User = {
      userId: payload.userId || socket.id,
      username: payload.username || `User-${socket.id.slice(0, 4)}`,
      color: payload.color || randomColor(),
    };

    connectedUsers.set(user.userId, user);
    socketToUserId.set(socket.id, user.userId);

    // Send current user list to the joining client
    socket.emit('presence:users', Array.from(connectedUsers.values()));

    // Notify everyone else that a new user joined
    socket.broadcast.emit('presence:joined', user);
  });

  socket.on('presence:cursor', (payload: PresenceCursorPayload) => {
    socket.broadcast.emit('presence:cursor', payload);
  });

  socket.on('disconnect', () => {
    const userId = socketToUserId.get(socket.id);
    socketToUserId.delete(socket.id);
    if (userId && connectedUsers.has(userId)) {
      connectedUsers.delete(userId);
      io.emit('presence:left', { userId });
    }
  });
}

function randomColor(): string {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
