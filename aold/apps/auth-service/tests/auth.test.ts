// ── Auth Service Unit Tests ───────────────────────────────────────
// Run: cd apps/auth-service && npm test

import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';

// Mock external dependencies before importing service
jest.mock('@aold/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    oAuthAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../src/config/redis', () => ({
  storeRefreshToken: jest.fn().mockResolvedValue(undefined),
  getStoredRefreshJti: jest.fn(),
  deleteRefreshToken: jest.fn().mockResolvedValue(undefined),
  blacklistJti: jest.fn().mockResolvedValue(undefined),
  isJtiBlacklisted: jest.fn().mockResolvedValue(false),
  recordLoginAttempt: jest.fn().mockResolvedValue(1),
  isLoginRateLimited: jest.fn().mockResolvedValue(false),
  clearLoginAttempts: jest.fn().mockResolvedValue(undefined),
}));

// Set required env vars before importing config
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_PRIVATE_KEY = 'test_private_key';
process.env.JWT_PUBLIC_KEY = 'test_public_key';

describe('Auth Service — register', () => {
  it('throws ConflictError if email already exists', async () => {
    const { prisma } = await import('@aold/database');
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'existing-id' });

    const { register } = await import('../src/services/auth.service');
    await expect(
      register({ email: 'test@test.com', password: 'Test1234!', fullName: 'Test User' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('creates user and returns tokens on success', async () => {
    const { prisma } = await import('@aold/database');
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    (prisma.user.create as jest.Mock).mockResolvedValueOnce({
      id: 'new-user-id',
      email: 'test@test.com',
      fullName: 'Test User',
      plan: 'free',
      storageUsedBytes: BigInt(0),
      storageQuotaBytes: BigInt(5368709120),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { register } = await import('../src/services/auth.service');
    const result = await register({
      email: 'test@test.com',
      password: 'Test1234!',
      fullName: 'Test User',
    });

    expect(result.user.email).toBe('test@test.com');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
  });
});

describe('Auth Schema Validation', () => {
  it('rejects weak passwords', async () => {
    const { registerSchema } = await import('../src/schemas/auth.schema');
    const result = registerSchema.safeParse({
      email: 'test@test.com',
      password: 'weak',
      fullName: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('normalizes email to lowercase', async () => {
    const { registerSchema } = await import('../src/schemas/auth.schema');
    const result = registerSchema.safeParse({
      email: 'TEST@EXAMPLE.COM',
      password: 'StrongPass1',
      fullName: 'Test',
    });
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });
});