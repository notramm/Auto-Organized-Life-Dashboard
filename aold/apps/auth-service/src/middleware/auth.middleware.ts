import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../services/jwt.service';
import { isJtiBlacklisted } from '../config/redis';
import { UnauthorizedError } from '@aold/shared-utils';

// Augment Fastify request type
declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userEmail: string;
    userPlan: string;
    jti: string;
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Bearer token required' },
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    // Check revocation
    if (await isJtiBlacklisted(payload.jti)) {
      return reply.status(401).send({
        success: false,
        error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked' },
      });
    }

    // Attach to request for downstream handlers
    request.userId = payload.sub;
    request.userEmail = payload.email;
    request.userPlan = payload.plan;
    request.jti = payload.jti;
  } catch (err) {
    const error = err instanceof UnauthorizedError ? err : new UnauthorizedError();
    return reply.status(401).send({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }
}