// ═══════════════════════════════════════════════════════════════
// Auth Service — Main Entry Point
// Port: 3001 (internal — not exposed to internet directly)
// All traffic comes via API Gateway on port 3000
// ═══════════════════════════════════════════════════════════════

import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCookie from '@fastify/cookie';
import { config } from './config';
import { redis } from './config/redis';
import { authRoutes } from './routes/auth.routes';
import { connectDatabase, disconnectDatabase, isDatabaseHealthy } from '@aold/database';
import { createLogger } from '@aold/shared-utils';

const log = createLogger('auth-service');

// ── Build Fastify app ─────────────────────────────────────────────
async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
          : undefined,
    },
    trustProxy: true, // needed to get real IP behind gateway/LB
    disableRequestLogging: false,
  });

  // ── Plugins ───────────────────────────────────────────────────
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false, // API only, no HTML
  });

  await app.register(fastifyCors, {
    origin: [config.FRONTEND_URL, config.API_GATEWAY_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET ?? 'dev-cookie-secret-change-in-production',
  });

  await app.register(fastifyRateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: () => ({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests' },
    }),
  });

  // ── Routes ────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/auth' });

  // ── Global error handler ──────────────────────────────────────
  app.setErrorHandler((error, _request, reply) => {
    log.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  // ── 404 handler ───────────────────────────────────────────────
  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  return app;
}

// ── Start ─────────────────────────────────────────────────────────
async function start() {
  try {
    // Connect to dependencies
    await connectDatabase();
    await redis.connect();

    const app = await buildApp();

    await app.listen({ port: config.PORT, host: config.HOST });
    log.info(`Auth Service running on http://${config.HOST}:${config.PORT}`);

    // ── Graceful shutdown ──────────────────────────────────────
    const shutdown = async (signal: string) => {
      log.info({ signal }, 'Shutdown signal received');
      await app.close();
      await disconnectDatabase();
      await redis.quit();
      log.info('Auth Service shut down cleanly');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    log.error({ err }, 'Failed to start Auth Service');
    process.exit(1);
  }
}

// ── Health check endpoint (outside prefix for k8s probes) ─────────
async function addHealthCheck(app: Awaited<ReturnType<typeof buildApp>>) {
  app.get('/healthz', async (_req, reply) => {
    const dbHealthy = await isDatabaseHealthy();
    const redisHealthy = redis.status === 'ready';
    const healthy = dbHealthy && redisHealthy;
    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      checks: { database: dbHealthy, redis: redisHealthy },
    });
  });
}

void start();