import { FastifyInstance } from 'fastify';
import * as taskService from '../services/taskService';

export async function taskRoutes(fastify: FastifyInstance): Promise<void> {
  // Initial board load — REST for reliability (not WebSocket)
  fastify.get('/api/tasks', async (_request, reply) => {
    const tasks = await taskService.getAllTasks();
    return reply.send(tasks);
  });

  // Health check
  fastify.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });
}
