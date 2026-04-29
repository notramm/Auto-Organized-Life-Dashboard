// apps/search-service/src/config/redis.ts
import Redis  from 'ioredis';
import crypto from 'crypto';
import { config } from './index';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: true,
});
redis.on('error', (err) => console.error('[Search:Redis]', err.message));

const SEARCH_TTL = 300;

export function buildCacheKey(userId: string, query: string, filters: Record<string, unknown>): string {
  const raw = `${userId}:${query}:${JSON.stringify(filters)}`;
  return `search:${crypto.createHash('sha256').update(raw).digest('hex')}`;
}

export async function getCachedResult(key: string): Promise<string | null> {
  return redis.get(key);
}

export async function setCachedResult(key: string, value: string): Promise<void> {
  await redis.setex(key, SEARCH_TTL, value);
}

const AUTOCOMPLETE_KEY = (userId: string) => `ac:${userId}`;

export async function saveQueryForAutocomplete(userId: string, query: string): Promise<void> {
  const key = AUTOCOMPLETE_KEY(userId);
  await redis.zadd(key, Date.now(), query);
  await redis.zremrangebyrank(key, 0, -51);
  await redis.expire(key, 86400 * 30);
}

export async function getAutocompleteSuggestions(userId: string, prefix: string): Promise<string[]> {
  const queries = await redis.zrevrange(AUTOCOMPLETE_KEY(userId), 0, 49);
  return queries
    .filter((q) => q.toLowerCase().startsWith(prefix.toLowerCase()))
    .slice(0, 5);
}