import { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import {
  registerSchema,
  loginSchema,
} from '../schemas/auth.schema';
import {
  register,
  login,
  refreshTokens,
  logout,
  getMe,
  upsertOAuthUser,
} from '../services/auth.service';
import { requireAuth } from '../middleware/auth.middleware';
import { success, errorResponse, generateRequestId, AppError } from '@aold/shared-utils';
import { config } from '../config';
import { createLogger } from '@aold/shared-utils';

const log = createLogger('auth:routes');

// Refresh token cookie config
const REFRESH_COOKIE = 'aold_refresh';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
};

export async function authRoutes(app: FastifyInstance) {

  // ── Error handler helper ────────────────────────────────────────
  const handleError = (err: unknown, reply: Parameters<typeof authRoutes>[0]['reply']) => {
    const requestId = generateRequestId();
    if (err instanceof ZodError) {
      return reply.status(400).send(
        errorResponse('VALIDATION_ERROR', 'Invalid input', requestId, err.flatten().fieldErrors),
      );
    }
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send(
        errorResponse(err.code, err.message, requestId, err.details),
      );
    }
    log.error({ err }, 'Unhandled error in auth route');
    return reply.status(500).send(
      errorResponse('INTERNAL_ERROR', 'Something went wrong', requestId),
    );
  };

  // ── POST /register ──────────────────────────────────────────────
  app.post('/register', async (request, reply) => {
    try {
      const input = registerSchema.parse(request.body);
      const { user, tokens } = await register(input);

      reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

      return reply.status(201).send(
        success({ user, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn }),
      );
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // ── POST /login ─────────────────────────────────────────────────
  app.post('/login', async (request, reply) => {
    try {
      const input = loginSchema.parse(request.body);
      const ip = request.ip ?? '0.0.0.0';
      const { user, tokens } = await login(input, ip);

      reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

      return reply.send(
        success({ user, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn }),
      );
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // ── POST /refresh ───────────────────────────────────────────────
  app.post('/refresh', async (request, reply) => {
    try {
      // Accept from cookie (web) or body (API clients)
      const cookieToken = request.cookies?.[REFRESH_COOKIE];
      const bodyToken = (request.body as { refreshToken?: string })?.refreshToken;
      const token = cookieToken ?? bodyToken;

      if (!token) {
        return reply.status(401).send(
          errorResponse('UNAUTHORIZED', 'Refresh token required', generateRequestId()),
        );
      }

      const { user, tokens } = await refreshTokens(token);

      // Rotate cookie
      reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

      return reply.send(
        success({ user, accessToken: tokens.accessToken, expiresIn: tokens.expiresIn }),
      );
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // ── POST /logout ────────────────────────────────────────────────
  app.post('/logout', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      await logout(request.userId, request.jti);
      reply.clearCookie(REFRESH_COOKIE, { path: '/' });
      return reply.send(success({ message: 'Logged out successfully' }));
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // ── GET /me ─────────────────────────────────────────────────────
  app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const user = await getMe(request.userId);
      return reply.send(success(user));
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // ── GET /health ─────────────────────────────────────────────────
  app.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok', service: 'auth-service', ts: new Date().toISOString() });
  });

  // ── GET /oauth/google ────────────────────────────────────────────
  // In production: use @fastify/oauth2 plugin
  // Here we handle the callback after Gateway redirects
  app.get('/oauth/google/callback', async (request, reply) => {
    try {
      // The OAuth2 plugin on the gateway handles the redirect.
      // By the time we're here, request.query has the profile data
      // passed as a signed internal header from the gateway.
      const query = request.query as {
        providerId: string;
        email: string;
        fullName: string;
        avatarUrl?: string;
        accessToken?: string;
      };

      const { user, tokens } = await upsertOAuthUser({
        provider: 'google',
        providerId: query.providerId,
        email: query.email,
        fullName: query.fullName,
        avatarUrl: query.avatarUrl,
        accessToken: query.accessToken,
      });

      reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

      // Redirect to frontend with access token in URL fragment
      const redirectUrl = new URL('/auth/oauth/success', config.FRONTEND_URL);
      redirectUrl.searchParams.set('token', tokens.accessToken);
      return reply.redirect(redirectUrl.toString());
    } catch (err) {
      const redirectUrl = new URL('/auth/error', config.FRONTEND_URL);
      return reply.redirect(redirectUrl.toString());
    }
  });
}