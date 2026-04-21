// apps/insights-service/src/routes/insights.routes.ts

import { FastifyInstance } from 'fastify';
import { z }              from 'zod';
import {
  getInsights, markAsRead, markAllRead,
  dismissInsight, generateDailyDigest, getStorageStats,
} from '../services/insights.service';
import { requireGatewayAuth } from '../middleware/auth.middleware';

function handleError(err: unknown, reply: any) {
  console.error('[Insights Routes]', err);
  return reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}

export async function insightsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireGatewayAuth);

  // GET /insights — list all insights
  app.get('/', async (req, reply) => {
    try {
      const { page = '1', limit = '20' } = req.query as Record<string, string>;
      const result = await getInsights(req.userId, Number(page), Number(limit));
      return reply.send({ success: true, data: result });
    } catch (err) { return handleError(err, reply); }
  });

  // GET /insights/storage — storage stats
  app.get('/storage', async (req, reply) => {
    try {
      const stats = await getStorageStats(req.userId);
      return reply.send({ success: true, data: stats });
    } catch (err) { return handleError(err, reply); }
  });

  // POST /insights/generate — manual trigger (dev/testing)
  app.post('/generate', async (req, reply) => {
    try {
      await generateDailyDigest(req.userId);
      return reply.send({ success: true, data: { message: 'Digest generated' } });
    } catch (err) { return handleError(err, reply); }
  });

  // PATCH /insights/:id/read
  app.patch('/:id/read', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await markAsRead(req.userId, id);
      return reply.send({ success: true, data: { read: true } });
    } catch (err) { return handleError(err, reply); }
  });

  // POST /insights/read-all
  app.post('/read-all', async (req, reply) => {
    try {
      await markAllRead(req.userId);
      return reply.send({ success: true, data: { allRead: true } });
    } catch (err) { return handleError(err, reply); }
  });

  // DELETE /insights/:id
  app.delete('/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await dismissInsight(req.userId, id);
      return reply.send({ success: true, data: { dismissed: true } });
    } catch (err) { return handleError(err, reply); }
  });

  app.get('/health', async (_req, reply) =>
    reply.send({ status: 'ok', service: 'insights-service' }),
  );
}