// ── Rate Limit Middleware ─────────────────────────────────────────
// Per-user rate limiting based on plan tier.
// Uses Redis sliding window counter.
// Authenticated users: keyed by userId
// Unauthenticated (public routes): keyed by IP

import { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../config/redis';
import { getRateLimitForPlan } from '../config/services';
import { SKIP_RATE_LIMIT_PATHS } from '../config/services';

const WINDOW_SECONDS = 60; // 1-minute sliding window

export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const path = request.url.split('?')[0];
  if (SKIP_RATE_LIMIT_PATHS.has(path)) return;

  // Key: authenticated → userId, else → ip
  const key = request.userId
    ? `rl:user:${request.userId}`
    : `rl:ip:${request.ip}`;

  const limit = request.userId
    ? getRateLimitForPlan(request.userPlan)
    : 30; // unauthenticated = 30 req/min

  try {
    const current = await redis.incr(key);
    if (current === 1) {
      // First request in window — set expiry
      await redis.expire(key, WINDOW_SECONDS);
    }

    // Set rate limit headers (standard)
    reply.header('X-RateLimit-Limit', limit);
    reply.header('X-RateLimit-Remaining', Math.max(0, limit - current));
    reply.header('X-RateLimit-Reset', Date.now() + WINDOW_SECONDS * 1000);

    if (current > limit) {
      reply.header('Retry-After', WINDOW_SECONDS);
      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `Rate limit exceeded. Max ${limit} requests per minute.`,
        },
        requestId: request.requestId,
      });
    }
  } catch {
    // Redis failure — fail open (don't block requests if Redis is down)
    request.log.warn('Rate limit Redis check failed — failing open');
  }
}