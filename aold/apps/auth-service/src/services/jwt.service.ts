// ── JWT Service — RS256 asymmetric signing ────────────────────
// Private key: Auth Service only (signs tokens)
// Public key: distributed to API Gateway + all services (verify only)

import { createSigner, createVerifier } from 'fast-jwt';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { JWTPayload, UserPlan } from '@aold/shared-types';
import { AppError } from '@aold/shared-utils';

// Parse TTL strings like '15m', '30d' → seconds
function parseTTL(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid TTL format: ${ttl}`);
  const [, n, unit] = match;
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return parseInt(n) * multipliers[unit];
}

// Private key for signing — replace literal \n with real newlines
const privateKey = config.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
const publicKey = config.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');

const ACCESS_TTL = parseTTL(config.JWT_ACCESS_TOKEN_EXPIRY);   // seconds
const REFRESH_TTL = parseTTL(config.JWT_REFRESH_TOKEN_EXPIRY); // seconds

const signAccess = createSigner({
  algorithm: 'RS256',
  key: privateKey,
  expiresIn: ACCESS_TTL * 1000, // fast-jwt uses ms
});

const signRefresh = createSigner({
  algorithm: 'RS256',
  key: privateKey,
  expiresIn: REFRESH_TTL * 1000,
});

const verify = createVerifier({
  algorithms: ['RS256'],
  key: publicKey,
  cache: true, // cache verified tokens (performance)
});

export interface AccessTokenPayload {
  sub: string;
  email: string;
  plan: UserPlan;
  jti: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

// ── Sign ──────────────────────────────────────────────────────
export function signAccessToken(
  userId: string,
  email: string,
  plan: UserPlan,
): { token: string; jti: string; expiresIn: number } {
  const jti = uuidv4();
  const token = signAccess({ sub: userId, email, plan, jti, type: 'access' });
  return { token, jti, expiresIn: ACCESS_TTL };
}

export function signRefreshToken(
  userId: string,
): { token: string; jti: string; ttlSeconds: number } {
  const jti = uuidv4();
  const token = signRefresh({ sub: userId, jti, type: 'refresh' });
  return { token, jti, ttlSeconds: REFRESH_TTL };
}

// ── Verify ────────────────────────────────────────────────────
export function verifyToken(token: string): AccessTokenPayload | RefreshTokenPayload {
  try {
    return verify(token) as AccessTokenPayload | RefreshTokenPayload;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token verification failed';
    if (message.includes('expired')) {
      throw new AppError('TOKEN_EXPIRED', 'Token has expired', 401);
    }
    throw new AppError('INVALID_TOKEN', 'Invalid token', 401);
  }
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = verifyToken(token);
  if (payload.type !== 'access') {
    throw new AppError('INVALID_TOKEN', 'Expected access token', 401);
  }
  return payload as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = verifyToken(token);
  if (payload.type !== 'refresh') {
    throw new AppError('INVALID_TOKEN', 'Expected refresh token', 401);
  }
  return payload as RefreshTokenPayload;
}

export { ACCESS_TTL, REFRESH_TTL };