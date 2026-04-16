import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.string().default('info'),

  REDIS_URL: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),

  // Downstream service URLs
  AUTH_SERVICE_URL: z.string().default('http://localhost:3001'),
  FILE_SERVICE_URL: z.string().default('http://localhost:3002'),
  SEARCH_SERVICE_URL: z.string().default('http://localhost:3003'),
  INSIGHTS_SERVICE_URL: z.string().default('http://localhost:3004'),
  NOTIFICATION_SERVICE_URL: z.string().default('http://localhost:3005'),
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z
    .string()
    .default('http://localhost:3000/api/auth/oauth/google/callback'),

  FRONTEND_URL: z.string().default('http://localhost:3002'),
  COOKIE_SECRET: z.string().default('dev-cookie-secret-change-in-production'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[Gateway] ❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;