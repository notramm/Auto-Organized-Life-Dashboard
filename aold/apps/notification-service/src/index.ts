// apps/notification-service/src/index.ts

import Fastify       from 'fastify';
import fastifyCors   from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { config }          from './config';
import { healthRoutes }    from './routes/health.routes';
import { startConsumer, stopConsumer } from './services/kafka.consumer';
import { PrismaClient }    from '@prisma/client';

const prisma = new PrismaClient();

async function start() {
  await prisma.$connect();
  console.info('[Notification] DB connected');

  // Start Kafka consumer
  await startConsumer();

  const app = Fastify({
    logger: process.env.NODE_ENV === 'development'
      ? { level: config.LOG_LEVEL, transport: { target: 'pino-pretty', options: { colorize: true } } }
      : { level: config.LOG_LEVEL },
    trustProxy: true,
  });

  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCors,   { credentials: true });
  await app.register(healthRoutes);

  await app.listen({ port: config.PORT, host: config.HOST });
  console.info(`[Notification Service] http://${config.HOST}:${config.PORT}`);

  const shutdown = async (sig: string) => {
    console.info(`[Notification] ${sig}`);
    await app.close();
    await stopConsumer();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('[Notification] Startup failed:', err);
  process.exit(1);
});