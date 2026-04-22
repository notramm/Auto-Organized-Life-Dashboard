// apps/notification-service/src/routes/health.routes.ts

import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_req, reply) =>
    reply.send({ status: 'ok', service: 'notification-service', ts: new Date().toISOString() }),
  );
  app.get('/healthz', async (_req, reply) =>
    reply.send({ status: 'ok' }),
  );
}