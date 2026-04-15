// ═══════════════════════════════════════════════════════════════
// @aold/database — Prisma client singleton
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';

// Prevent multiple instances in development (hot reloading)
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const createPrismaClient = () =>
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  });

export const prisma = global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// ── Connection helpers ────────────────────────────────────────────
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.info('[DB] PostgreSQL connected');
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.info('[DB] PostgreSQL disconnected');
}

// ── Health check ──────────────────────────────────────────────────
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// Re-export Prisma types for convenience
export { Prisma } from '@prisma/client';
export type {
  User,
  File,
  Folder,
  FileTag,
  FileAIMetadata,
  FilePreview,
  SearchLog,
  InsightItem,
  AuditLog,
  OAuthAccount,
  UserSession,
  UserPlan,
  FileStatus,
  FileType,
  TagSource,
} from '@prisma/client';