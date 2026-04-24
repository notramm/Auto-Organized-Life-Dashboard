// ── Reverse Proxy Plugin ──────────────────────────────────────────
// Routes requests to the correct downstream microservice.
// Injects verified user context as internal headers.
// Downstream services TRUST these headers — they are never
// set by external clients (stripped at gateway entry).

import { FastifyInstance } from 'fastify';
import httpProxy from '@fastify/http-proxy';
import { services } from '../config/services';
import { createLogger } from '@aold/shared-utils';

const log = createLogger('gateway:proxy');

// Headers that external clients must NEVER be able to spoof.
// Gateway strips them from incoming requests, then re-sets them
// after JWT verification.
const INTERNAL_HEADERS = [
  'x-user-id',
  'x-user-email',
  'x-user-plan',
  'x-request-id',
  'x-internal-token', // shared secret for service-to-service calls
];

export async function registerProxies(app: FastifyInstance) {
  for (const service of services) {
    log.info(`Registering proxy: ${service.prefix} → ${service.url}${service.rewritePrefix}`);

    await app.register(httpProxy, {
      upstream:      service.url,
      prefix:        service.prefix,
      rewritePrefix: service.rewritePrefix,  // ← YAHAN USE KARO
      replyOptions: {
        rewriteRequestHeaders: (request, headers) => {
          for (const h of INTERNAL_HEADERS) { delete headers[h]; }
          if (request.userId) {
            headers['x-user-id']    = request.userId;
            headers['x-user-email'] = request.userEmail ?? '';
            headers['x-user-plan']  = request.userPlan  ?? 'free';
          }
          headers['x-request-id']     = request.requestId;
          headers['x-gateway-secret'] = process.env.GATEWAY_INTERNAL_SECRET ?? 'dev-gateway-secret';
          return headers;
        },
      },
      httpMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    });
  }
}