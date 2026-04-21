// apps/insights-service/src/config/index.ts

import { z } from 'zod';

const schema = z.object({
  NODE_ENV:  z.enum(['development', 'production', 'test']).default('development'),
  PORT:      z.coerce.number().default(3004),
  HOST:      z.string().default('0.0.0.0'),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL:    z.string().min(1),

  OPENAI_API_KEY:   z.string().min(1),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),

  KAFKA_BROKERS:   z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('insights-service'),

  GATEWAY_INTERNAL_SECRET: z.string().default('dev-gateway-secret'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[Insights] ❌ Bad env vars:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;