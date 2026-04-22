// apps/notification-service/src/config/index.ts

import { z } from 'zod';

const schema = z.object({
  NODE_ENV:  z.enum(['development', 'production', 'test']).default('development'),
  PORT:      z.coerce.number().default(3005),
  HOST:      z.string().default('0.0.0.0'),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL:    z.string().min(1),

  KAFKA_BROKERS:   z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('notification-service'),

  // AWS SES for email
  AWS_REGION:            z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID:     z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  SES_FROM_EMAIL:        z.string().default('noreply@aold.dev'),
  SES_FROM_NAME:         z.string().default('AOLD'),

  GATEWAY_INTERNAL_SECRET: z.string().default('dev-gateway-secret'),
  FRONTEND_URL:            z.string().default('http://localhost:3002'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[Notification] ❌ Bad env vars:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;