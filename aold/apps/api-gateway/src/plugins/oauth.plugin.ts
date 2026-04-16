// ── Google OAuth2 ─────────────────────────────────────────────────
// The gateway handles the OAuth dance.
// After token exchange, it forwards the profile to Auth Service.

import { FastifyInstance } from 'fastify';
import fastifyOAuth2 from '@fastify/oauth2';
import { config } from '../config';
import { createLogger } from '@aold/shared-utils';

const log = createLogger('gateway:oauth');

export async function registerOAuth(app: FastifyInstance) {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    log.warn('Google OAuth not configured — skipping OAuth plugin');
    return;
  }

  await app.register(fastifyOAuth2, {
    name: 'googleOAuth2',
    scope: ['profile', 'email'],
    credentials: {
      client: {
        id: config.GOOGLE_CLIENT_ID,
        secret: config.GOOGLE_CLIENT_SECRET,
      },
      auth: fastifyOAuth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/api/auth/oauth/google',
    callbackUri: config.GOOGLE_CALLBACK_URL,
    callbackUriParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });

  // Handle OAuth callback
  app.get('/api/auth/oauth/google/callback', async (request, reply) => {
    try {
      // @ts-expect-error — fastify-oauth2 adds this
      const { token } = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      // Fetch Google profile
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const profile = (await profileRes.json()) as {
        id: string;
        email: string;
        name: string;
        picture?: string;
      };

      // Forward to Auth Service with profile data
      const authUrl = new URL('/auth/oauth/google/callback', config.AUTH_SERVICE_URL);
      authUrl.searchParams.set('providerId', profile.id);
      authUrl.searchParams.set('email', profile.email);
      authUrl.searchParams.set('fullName', profile.name);
      if (profile.picture) authUrl.searchParams.set('avatarUrl', profile.picture);
      if (token.access_token) authUrl.searchParams.set('accessToken', token.access_token);

      return reply.redirect(authUrl.toString());
    } catch (err) {
      log.error({ err }, 'Google OAuth callback failed');
      return reply.redirect(`${config.FRONTEND_URL}/auth/error?reason=oauth_failed`);
    }
  });
}