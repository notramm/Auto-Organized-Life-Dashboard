// apps/insights-service/src/index.ts

import Fastify       from 'fastify';
import fastifyCors   from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { config }           from './config';
import { insightsRoutes }   from './routes/insights.routes';
import { startDigestJob }   from './jobs/digest.job';
import { PrismaClient }     from '@prisma/client';

const prisma = new PrismaClient();

async function start() {
  await prisma.$connect();
  console.info('[Insights] DB connected');

  const app = Fastify({
    logger: process.env.NODE_ENV === 'development'
      ? { level: config.LOG_LEVEL, transport: { target: 'pino-pretty', options: { colorize: true } } }
      : { level: config.LOG_LEVEL },
    trustProxy: true,
  });

  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCors,   { credentials: true });
  await app.register(insightsRoutes, { prefix: '/insights' });

  app.get('/health', async (_req, reply) =>
    reply.send({ status: 'ok', service: 'insights-service', ts: new Date().toISOString() }),
  );

  await app.listen({ port: config.PORT, host: config.HOST });
  console.info(`[Insights Service] http://${config.HOST}:${config.PORT}`);

  // Start cron
  startDigestJob();

  const shutdown = async (sig: string) => {
    console.info(`[Insights] ${sig}`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));
}

start().catch((err) => { console.error('[Insights] Startup failed:', err); process.exit(1); });