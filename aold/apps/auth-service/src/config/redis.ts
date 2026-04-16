import Redis from 'ioredis';
import { config } from '../config';
import { createLogger } from '@aold/shared-utils';

const log = createLogger('auth:redis');

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: true,
});

redis.on('connect', () => log.info('Redis connected'));
redis.on('error', (err) => log.error({ err }, 'Redis error'));
redis.on('reconnecting', () => log.warn('Redis reconnecting'));

// ── Key helpers ────────────────────────────────────────────────
const REFRESH_PREFIX = 'rt:';       // refresh token store
const BLACKLIST_PREFIX = 'bl:';     // revoked JTI blacklist
const RATE_PREFIX = 'rl:login:';    // login rate limiting

export const redisKeys = {
  refreshToken: (userId: string) => `${REFRESH_PREFIX}${userId}`,
  blacklist: (jti: string) => `${BLACKLIST_PREFIX}${jti}`,
  loginAttempts: (ip: string) => `${RATE_PREFIX}${ip}`,
};

// ── Token operations ───────────────────────────────────────────
export async function storeRefreshToken(
  userId: string,
  jti: string,
  ttlSeconds: number,
): Promise<void> {
  await redis.setex(redisKeys.refreshToken(userId), ttlSeconds, jti);
}

export async function getStoredRefreshJti(userId: string): Promise<string | null> {
  return redis.get(redisKeys.refreshToken(userId));
}

export async function deleteRefreshToken(userId: string): Promise<void> {
  await redis.del(redisKeys.refreshToken(userId));
}

export async function blacklistJti(jti: string, ttlSeconds: number): Promise<void> {
  await redis.setex(redisKeys.blacklist(jti), ttlSeconds, '1');
}

export async function isJtiBlacklisted(jti: string): Promise<boolean> {
  const result = await redis.get(redisKeys.blacklist(jti));
  return result === '1';
}

// ── Login brute-force protection ───────────────────────────────
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_SECONDS = 900; // 15 minutes

export async function recordLoginAttempt(ip: string): Promise<number> {
  const key = redisKeys.loginAttempts(ip);
  const attempts = await redis.incr(key);
  if (attempts === 1) await redis.expire(key, LOGIN_WINDOW_SECONDS);
  return attempts;
}

export async function isLoginRateLimited(ip: string): Promise<boolean> {
  const attempts = await redis.get(redisKeys.loginAttempts(ip));
  return parseInt(attempts ?? '0') >= MAX_LOGIN_ATTEMPTS;
}

export async function clearLoginAttempts(ip: string): Promise<void> {
  await redis.del(redisKeys.loginAttempts(ip));
}