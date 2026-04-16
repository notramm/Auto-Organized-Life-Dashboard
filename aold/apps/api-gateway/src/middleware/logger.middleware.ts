// ── Request Logger ────────────────────────────────────────────────
// Logs every request with timing, user context, and upstream info.
// Used for debugging, auditing, and observability.

import { FastifyRequest, FastifyReply } from 'fastify';

export function requestLogger(request: FastifyRequest, _reply: FastifyReply, done: () => void) {
  const start = Date.now();

  // Log on response complete
  request.raw.on('close', () => {
    const duration = Date.now() - start;
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: request.raw.statusCode,
      durationMs: duration,
      userId: request.userId ?? 'anonymous',
      userPlan: request.userPlan ?? 'none',
      requestId: request.requestId,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  });

  done();
}