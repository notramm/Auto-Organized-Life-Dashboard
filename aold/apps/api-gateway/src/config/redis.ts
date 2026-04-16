import Redis from 'ioredis';
import { config } from '../config';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: true,
});

redis.on('error', (err) => console.error('[Gateway:Redis]', err.message));

// Check if a JTI has been blacklisted (logout / token revocation)
export async function isJtiBlacklisted(jti: string): Promise<boolean> {
  const result = await redis.get(`bl:${jti}`);
  return result === '1';
}