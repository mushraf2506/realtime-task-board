import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { registerTaskHandlers } from './handlers/taskHandlers';
import { registerPresenceHandlers } from './handlers/presenceHandlers';
import { User } from '../types';

// Track connected users in memory
const connectedUsers = new Map<string, User>();
// Maps socket.id → userId for correct cleanup on disconnect
const socketToUserId = new Map<string, string>();

export function createSocketServer(httpServer: HttpServer): IOServer {
  const io = new IOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
    pingInterval: 5000,
    pingTimeout: 3000,
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handlers are registered separately — no monolithic handler
    registerPresenceHandlers(io, socket, connectedUsers, socketToUserId);
    registerTaskHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export { connectedUsers };
