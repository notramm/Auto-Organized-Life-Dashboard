// ── JWT Middleware ────────────────────────────────────────────────
// Runs on every request BEFORE proxying to downstream services.
// Validates token, checks blacklist, injects user headers.

import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { createVerifier } from 'fast-jwt';
import { config } from '../config';
import { isJtiBlacklisted } from '../config/redis';
import { PUBLIC_PATHS } from '../config/services';
import { generateRequestId } from '@aold/shared-utils';

// Augment Fastify request type
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userEmail?: string;
    userPlan?: string;
    jti?: string;
    requestId: string;
  }
}

const publicKey = config.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');

// Cache verified tokens for performance — avoids re-verifying same token
const verify = createVerifier({
  algorithms: ['RS256'],
  key: publicKey,
  cache: true,
  cacheTTL: 60_000, // 1 minute cache
});

export async function jwtMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Inject request ID for distributed tracing
  request.requestId =
    (request.headers['x-request-id'] as string) ?? generateRequestId();
  reply.header('x-request-id', request.requestId);

  const path = request.url.split('?')[0];

  // Skip JWT for public routes
  if (PUBLIC_PATHS.has(path)) return;

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Bearer token required' },
      requestId: request.requestId,
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = verify(token) as {
      sub: string;
      email: string;
      plan: string;
      jti: string;
      type: string;
      exp: number;
    };

    if (payload.type !== 'access') {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Access token required' },
        requestId: request.requestId,
      });
    }

    // Check revocation (logout invalidates JTI in Redis)
    if (await isJtiBlacklisted(payload.jti)) {
      return reply.status(401).send({
        success: false,
        error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked' },
        requestId: request.requestId,
      });
    }

    // Attach to request — also forwarded as headers to downstream services
    request.userId = payload.sub;
    request.userEmail = payload.email;
    request.userPlan = payload.plan;
    request.jti = payload.jti;
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes('expired')
        ? 'Token has expired'
        : 'Invalid token';
    const code =
      err instanceof Error && err.message.includes('expired')
        ? 'TOKEN_EXPIRED'
        : 'INVALID_TOKEN';

    return reply.status(401).send({
      success: false,
      error: { code, message },
      requestId: request.requestId,
    });
  }
}