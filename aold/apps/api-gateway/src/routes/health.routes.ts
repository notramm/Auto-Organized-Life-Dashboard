// ── Health Check Routes ───────────────────────────────────────────
// GET /healthz          — k8s liveness probe (fast, no downstream)
// GET /api/health       — readiness probe (checks all services)
// GET /api/health/full  — detailed status of every service

import { FastifyInstance } from 'fastify';
import { config } from '../config';
import { redis } from '../config/redis';
import { services } from '../config/services';

interface ServiceHealth {
  name: string;
  url: string;
  status: 'ok' | 'degraded' | 'down';
  latencyMs?: number;
  error?: string;
}

async function checkService(name: string, url: string): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(3000), // 3s timeout
    });
    return {
      name,
      url,
      status: res.ok ? 'ok' : 'degraded',
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name,
      url,
      status: 'down',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function healthRoutes(app: FastifyInstance) {
  // ── k8s liveness probe — always 200 if process is alive ──────
  app.get('/healthz', async (_req, reply) => {
    return reply.send({ status: 'ok', service: 'api-gateway', ts: new Date().toISOString() });
  });

  // ── Readiness probe — checks Redis ───────────────────────────
  app.get('/api/health', async (_req, reply) => {
    const redisOk = redis.status === 'ready';
    return reply.status(redisOk ? 200 : 503).send({
      status: redisOk ? 'ok' : 'degraded',
      service: 'api-gateway',
      checks: { redis: redisOk },
      ts: new Date().toISOString(),
    });
  });

  // ── Full health — checks all downstream services ──────────────
  app.get('/api/health/full', async (_req, reply) => {
    const checks = await Promise.all(
      services.map((s) => {
        const name = s.description.split(' ')[0].toLowerCase();
        return checkService(name, s.url);
      }),
    );

    const redisOk = redis.status === 'ready';
    const allOk = redisOk && checks.every((c) => c.status === 'ok');

    return reply.status(allOk ? 200 : 207).send({
      status: allOk ? 'ok' : 'degraded',
      gateway: { redis: redisOk ? 'ok' : 'down' },
      services: checks,
      ts: new Date().toISOString(),
    });
  });
}