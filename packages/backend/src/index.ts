import Fastify from 'fastify';
import cors from '@fastify/cors';
import { runMigrations } from './db/client';
import { taskRoutes } from './routes/tasks';
import { createSocketServer } from './ws/server';
import { getAllTasks } from './services/taskService';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  try {
    await runMigrations();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }

  const fastify = Fastify({ logger: { level: 'info' } });

  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await fastify.register(taskRoutes);

  // Must call ready() before accessing fastify.server for Socket.IO
  await fastify.ready();

  // Attach Socket.IO directly to Fastify's underlying http.Server
  const io = createSocketServer(fastify.server);

  // On every new WS connection, push current board state
  io.on('connection', async (socket) => {
    try {
      const tasks = await getAllTasks();
      socket.emit('board:state', tasks);
    } catch (err) {
      console.error('Failed to send initial board state:', err);
    }
  });

  // Use fastify.listen so Fastify owns and binds the port
  await fastify.listen({ port: PORT, host: HOST });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
