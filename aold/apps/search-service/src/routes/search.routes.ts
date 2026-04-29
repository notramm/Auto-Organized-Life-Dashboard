// apps/search-service/src/routes/search.routes.ts
import { FastifyInstance } from 'fastify';
import { ZodError }        from 'zod';
import { searchSchema, feedbackSchema, suggestionsSchema } from '../schemas/search.schema';
import { search, logClickFeedback }   from '../services/search.service';
import { getAutocompleteSuggestions } from '../config/redis';
import { requireGatewayAuth }         from '../middleware/auth.middleware';

function handleError(err: unknown, reply: any) {
  if (err instanceof ZodError) {
    return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', details: err.flatten().fieldErrors } });
  }
  console.error('[Search Routes]', err);
  return reply.status(500).send({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Search failed' } });
}

export async function searchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireGatewayAuth);

  // GET /search?q=...
  app.get('/', async (req, reply) => {
    try {
      const result = await search(req.userId, searchSchema.parse(req.query));
      return reply.send({ success: true, data: result });
    } catch (err) { return handleError(err, reply); }
  });

  // GET /search/suggestions?q=...
  app.get('/suggestions', async (req, reply) => {
    try {
      const { q }       = suggestionsSchema.parse(req.query);
      const suggestions = await getAutocompleteSuggestions(req.userId, q);
      return reply.send({ success: true, data: { suggestions } });
    } catch (err) { return handleError(err, reply); }
  });

  // POST /search/feedback
  app.post('/feedback', async (req, reply) => {
    try {
      const { query, fileId } = feedbackSchema.parse(req.body);
      await logClickFeedback(req.userId, query, fileId);
      return reply.send({ success: true, data: { recorded: true } });
    } catch (err) { return handleError(err, reply); }
  });

  app.get('/health', async (_req, reply) =>
    reply.send({ status: 'ok', service: 'search-service' }),
  );
}