// apps/web — nahi, yeh gateway mein hai
// apps/api-gateway/src/middleware/logger.middleware.ts

import { FastifyRequest, FastifyReply } from 'fastify';

export function requestLogger(
  request: FastifyRequest,
  _reply:  FastifyReply,
  done:    () => void,
) {
  done(); // Fastify 5 mein onRequest hook mein done() call karo
  // Logging request.raw pe depend mat karo
  request.log.info({
    method:    request.method,
    url:       request.url,
    userId:    request.userId ?? 'anonymous',
    requestId: request.requestId ?? 'none',
    ip:        request.ip ?? 'unknown',
  });
}