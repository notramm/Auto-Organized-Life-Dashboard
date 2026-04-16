// ═══════════════════════════════════════════════════════════════
// API Gateway — Main Entry Point
// Port: 3000 (the ONLY port exposed to the internet)
//
// Request flow:
//   Client → Gateway (3000)
//     → JWT middleware (verify + blacklist check)
//     → Rate limit middleware (per-user plan)
//     → Proxy → downstream service
//
// All downstream services run on internal ports and accept
// requests ONLY from the gateway (enforced via x-gateway-secret).
// ═══════════════════════════════════════════════════════════════

import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import { config } from './config';
import { redis } from './config/redis';
import { jwtMiddleware } from './middleware/jwt.middleware';
import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { registerProxies } from './plugins/proxy.plugin';
import { registerOAuth } from './plugins/oauth.plugin';
import { healthRoutes } from './routes/health.routes';
import { createLogger } from '@aold/shared-utils';

const log = createLogger('api-gateway');

async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
          : undefined,
    },
    trustProxy: true,
    // Increase body limit for file metadata (actual files go direct to S3)
    bodyLimit: 1_048_576, // 1 MB — enough for metadata, not for file uploads
  });

  // ── Security headers ────────────────────────────────────────
  await app.register(fastifyHelmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  });

  // ── CORS ────────────────────────────────────────────────────
  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      // Allow requests from frontend and same-origin
      const allowed = [config.FRONTEND_URL, 'http://localhost:3002'];
      if (!origin || allowed.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  });

  // ── Cookies ─────────────────────────────────────────────────
  await app.register(fastifyCookie, {
    secret: config.COOKIE_SECRET,
  });

  // ── Global hooks ────────────────────────────────────────────
  // Order matters: logger → JWT → rate limit → proxy
  app.addHook('onRequest', requestLogger);
  app.addHook('preHandler', jwtMiddleware);
  app.addHook('preHandler', rateLimitMiddleware);

  // ── Health routes (registered before proxy to avoid conflicts) ─
  await app.register(healthRoutes);

  // ── OAuth plugin ─────────────────────────────────────────────
  await registerOAuth(app);

  // ── Reverse proxies to all downstream services ───────────────
  await registerProxies(app);

  // ── 404 catch-all ────────────────────────────────────────────
  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
      requestId: request.requestId,
    });
  });

  // ── Global error handler ──────────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    log.error({ err: error, requestId: request.requestId }, 'Unhandled gateway error');
    return reply.status(500).send({
      success: false,
      error: { code: 'GATEWAY_ERROR', message: 'Internal gateway error' },
      requestId: request.requestId,
    });
  });

  return app;
}

async function start() {
  try {
    await redis.connect();
    log.info('Redis connected');

    const app = await buildApp();

    await app.listen({ port: config.PORT, host: config.HOST });
    log.info(`
╔══════════════════════════════════════════════╗
║  API Gateway running on port ${config.PORT}           ║
║  Environment: ${config.NODE_ENV.padEnd(30)}║
║  Health: http://localhost:${config.PORT}/healthz       ║
╚══════════════════════════════════════════════╝`);

    // ── Graceful shutdown ──────────────────────────────────────
    const shutdown = async (signal: string) => {
      log.info({ signal }, 'Shutdown signal received');
      await app.close();
      await redis.quit();
      log.info('Gateway shut down cleanly');
      process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (err) {
    log.error({ err }, 'Failed to start API Gateway');
    process.exit(1);
  }
}

void start();