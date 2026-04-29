// apps/search-service/src/config/index.ts
import { z } from 'zod';

const schema = z.object({
  NODE_ENV:  z.enum(['development', 'production', 'test']).default('development'),
  PORT:      z.coerce.number().default(3003),
  HOST:      z.string().default('0.0.0.0'),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL:    z.string().min(1),

  PINECONE_API_KEY:    z.string().min(1),
  PINECONE_INDEX_NAME: z.string().default('aold-embeddings'),

  OPENAI_API_KEY:         z.string().min(1),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  KAFKA_BROKERS:   z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('search-service'),

  GATEWAY_INTERNAL_SECRET: z.string().default('dev-gateway-secret'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[Search] Bad env:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;