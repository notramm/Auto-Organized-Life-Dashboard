// apps/file-service/src/config/index.ts

import { z } from 'zod';

const schema = z.object({
  NODE_ENV:    z.enum(['development', 'production', 'test']).default('development'),
  PORT:        z.coerce.number().default(3002),
  HOST:        z.string().default('0.0.0.0'),
  LOG_LEVEL:   z.string().default('info'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL:    z.string().min(1),

  AWS_REGION:                z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID:         z.string().min(1),
  AWS_SECRET_ACCESS_KEY:     z.string().min(1),
  S3_BUCKET_NAME:            z.string().min(1),
  S3_ENDPOINT:               z.string().optional(), // MinIO local
  S3_PRESIGN_EXPIRY_SECONDS: z.coerce.number().default(3600),
  CLOUDFRONT_DOMAIN:         z.string().optional(),

  KAFKA_BROKERS:   z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('file-service'),

  GATEWAY_INTERNAL_SECRET: z.string().default('dev-gateway-secret'),
  FRONTEND_URL:            z.string().default('http://localhost:3002'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[File Service] ❌ Bad env vars:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;