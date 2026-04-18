// apps/file-service/src/index.ts

import Fastify        from 'fastify';
import fastifyCors    from '@fastify/cors';
import fastifyHelmet  from '@fastify/helmet';
import { config }           from './config';
import { fileRoutes }       from './routes/file.routes';
import { folderRoutes }     from './routes/folder.routes';
import { getProducer, disconnectProducer } from './config/kafka';
import { PrismaClient }     from '@prisma/client';
import { startConsumer } from './config/consumer';

const prisma = new PrismaClient();

async function start() {
  await prisma.$connect();
  console.info('[DB] Connected');

  await getProducer();
  await startConsumer();

  const app = Fastify({
    logger: process.env.NODE_ENV === 'development'
      ? { level: config.LOG_LEVEL, transport: { target: 'pino-pretty', options: { colorize: true } } }
      : { level: config.LOG_LEVEL },
    trustProxy: true,
    bodyLimit:  1_048_576,
  });

  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCors,   { origin: [config.FRONTEND_URL], credentials: true });
  await app.register(fileRoutes,    { prefix: '/files' });
  await app.register(folderRoutes,  { prefix: '/folders' });

  app.get('/health', async (_req, reply) =>
    reply.send({ status: 'ok', service: 'file-service', ts: new Date().toISOString() }),
  );

  await app.listen({ port: config.PORT, host: config.HOST });
  console.info(`[File Service] http://${config.HOST}:${config.PORT}`);

  const shutdown = async (signal: string) => {
    console.info(`[File Service] ${signal} — shutting down`);
    await app.close();
    await prisma.$disconnect();
    await disconnectProducer();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));
}

start().catch((err) => { console.error('[File Service] Startup failed:', err); process.exit(1); });