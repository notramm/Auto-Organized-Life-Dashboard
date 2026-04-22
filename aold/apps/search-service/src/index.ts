// apps/search-service/src/index.ts

import Fastify       from 'fastify';
import fastifyCors   from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { config }           from './config';
import { redis }            from './config/redis';
import { searchRoutes }     from './routes/search.routes';
import { disconnectProducer } from './config/kafka';
import { PrismaClient }     from '@prisma/client';

const prisma = new PrismaClient();

async function start() {
  await prisma.$connect();
  console.info('[Search] DB connected');
  await redis.connect();
  console.info('[Search] Redis connected');

  const app = Fastify({
    logger: process.env.NODE_ENV === 'development'
      ? { level: config.LOG_LEVEL, transport: { target: 'pino-pretty', options: { colorize: true } } }
      : { level: config.LOG_LEVEL },
    trustProxy: true,
  });

  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCors,   { credentials: true });
  await app.register(searchRoutes,  { prefix: '/search' });

  app.get('/health', async (_req, reply) =>
    reply.send({ status: 'ok', service: 'search-service', ts: new Date().toISOString() }),
  );

  await app.listen({ port: config.PORT, host: config.HOST });
  console.info(`[Search Service] http://${config.HOST}:${config.PORT}`);

  const shutdown = async (sig: string) => {
    console.info(`[Search] ${sig}`);
    await app.close();
    await prisma.$disconnect();
    await redis.quit();
    await disconnectProducer();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));
}

start().catch((err) => { console.error('[Search] Startup failed:', err); process.exit(1); });