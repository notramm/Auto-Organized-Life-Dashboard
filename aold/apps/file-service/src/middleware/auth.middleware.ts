// apps/file-service/src/middleware/auth.middleware.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';

declare module 'fastify' {
  interface FastifyRequest {
    userId:    string;
    userEmail: string;
    userPlan:  string;
    requestId: string;
  }
}

export async function requireGatewayAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Reject direct requests that bypassed the gateway
  const secret = request.headers['x-gateway-secret'];
  if (secret !== config.GATEWAY_INTERNAL_SECRET) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Direct access not allowed' },
    });
  }

  const userId = request.headers['x-user-id'] as string;
  if (!userId) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  request.userId    = userId;
  request.userEmail = (request.headers['x-user-email'] as string) ?? '';
  request.userPlan  = (request.headers['x-user-plan']  as string) ?? 'free';
  request.requestId = (request.headers['x-request-id'] as string) ?? `req_${Date.now()}`;
}