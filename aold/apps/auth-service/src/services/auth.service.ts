// ── Auth Service — Core Business Logic ───────────────────────────
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { UserPlan } from '@aold/shared-types';
import {
  AppError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  generateId,
  createLogger,
} from '@aold/shared-utils';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_TTL,
} from './jwt.service';
import {
  storeRefreshToken,
  getStoredRefreshJti,
  deleteRefreshToken,
  blacklistJti,
  isJtiBlacklisted,
  recordLoginAttempt,
  isLoginRateLimited,
  clearLoginAttempts,
} from '../config/redis';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema';

const log = createLogger('auth:service');

// ── Argon2id config (OWASP recommended) ──────────────────────────
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4,
};

// BigInt → Number (PostgreSQL numeric fields)
function sanitizeUser<T extends object>(user: T): T {
  return JSON.parse(
    JSON.stringify(user, (_key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  );
}

// ── Register ──────────────────────────────────────────────────────
export async function register(input: RegisterInput) {
  // Check duplicate email
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  // Hash password
  const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);

  // Create user
  const user = await prisma.user.create({
    data: {
      id: generateId(),
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      plan: UserPlan.FREE,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      plan: true,
      storageUsedBytes: true,
      storageQuotaBytes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  log.info({ userId: user.id }, 'User registered');

  // Issue tokens
  const tokens = await issueTokenPair(user.id, user.email, user.plan as UserPlan);

  return { user: sanitizeUser(user), tokens };
}

// ── Login ─────────────────────────────────────────────────────────
export async function login(input: LoginInput, ipAddress: string) {
  // Brute-force check
  if (await isLoginRateLimited(ipAddress)) {
    throw new AppError(
      'RATE_LIMITED',
      'Too many login attempts. Please try again in 15 minutes.',
      429,
    );
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      plan: true,
      passwordHash: true,
      storageUsedBytes: true,
      storageQuotaBytes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user || !user.passwordHash) {
    await recordLoginAttempt(ipAddress);
    // Constant-time response to prevent user enumeration
    await argon2.hash('dummy_prevent_timing_attack', ARGON2_OPTIONS);
    throw new UnauthorizedError('Invalid email or password');
  }

  // Verify password
  const valid = await argon2.verify(user.passwordHash, input.password);
  if (!valid) {
    await recordLoginAttempt(ipAddress);
    throw new UnauthorizedError('Invalid email or password');
  }

  // Success — clear rate limit
  await clearLoginAttempts(ipAddress);
  log.info({ userId: user.id }, 'User logged in');

  const tokens = await issueTokenPair(user.id, user.email, user.plan as UserPlan);
  const { passwordHash: _, ...safeUser } = user;

  return { user: sanitizeUser(safeUser), tokens };
}

// ── Refresh ───────────────────────────────────────────────────────
export async function refreshTokens(refreshToken: string) {
  // Verify signature and type
  const payload = verifyRefreshToken(refreshToken);

  // Check not blacklisted
  if (await isJtiBlacklisted(payload.jti)) {
    throw new UnauthorizedError('Refresh token has been revoked');
  }

  // Check it matches what we stored (rotation: each refresh token is single-use)
  const storedJti = await getStoredRefreshJti(payload.sub);
  if (!storedJti || storedJti !== payload.jti) {
    // Possible token theft — invalidate everything
    await deleteRefreshToken(payload.sub);
    throw new UnauthorizedError('Refresh token is invalid or already used');
  }

  // Load user
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      plan: true,
      storageUsedBytes: true,
      storageQuotaBytes: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) throw new UnauthorizedError('User not found');

  // Blacklist old refresh token JTI
  await blacklistJti(payload.jti, REFRESH_TTL);

  // Issue new token pair
  const tokens = await issueTokenPair(user.id, user.email, user.plan as UserPlan);
  log.info({ userId: user.id }, 'Tokens refreshed');

  return { user: sanitizeUser(user), tokens };
}

// ── Logout ────────────────────────────────────────────────────────
export async function logout(userId: string, accessJti: string) {
  // Blacklist current access token JTI
  await blacklistJti(accessJti, 900); // 15 min = access token max TTL

  // Delete refresh token (prevents any future refresh)
  await deleteRefreshToken(userId);

  log.info({ userId }, 'User logged out');
}

// ── Get current user ──────────────────────────────────────────────
export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      plan: true,
      storageUsedBytes: true,
      storageQuotaBytes: true,
      emailVerified: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) throw new NotFoundError('User');
  return {user: sanitizeUser(user)};
}

// ── OAuth upsert (Google) ─────────────────────────────────────────
export async function upsertOAuthUser(profile: {
  provider: string;
  providerId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
}) {
  // Check if OAuth account exists
  const oauthAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerId: {
        provider: profile.provider,
        providerId: profile.providerId,
      },
    },
    include: { user: true },
  });

  let userId: string;

  if (oauthAccount) {
    // Update tokens
    await prisma.oAuthAccount.update({
      where: { id: oauthAccount.id },
      data: {
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
      },
    });
    userId = oauthAccount.userId;
  } else {
    // Check if email exists (link accounts)
    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          id: generateId(),
          email: profile.email,
          fullName: profile.fullName,
          avatarUrl: profile.avatarUrl,
          emailVerified: true, // OAuth emails are pre-verified
          plan: UserPlan.FREE,
        },
      });
      userId = newUser.id;
    }

    // Create OAuth link
    await prisma.oAuthAccount.create({
      data: {
        userId,
        provider: profile.provider,
        providerId: profile.providerId,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
      },
    });
  }

  const user = await getMe(userId);
  const tokens = await issueTokenPair(user.id, user.email, user.plan as UserPlan);
  log.info({ userId, provider: profile.provider }, 'OAuth login');

  return { user: sanitizeUser(user), tokens };
}

// ── Internal: issue access + refresh pair ─────────────────────────
async function issueTokenPair(userId: string, email: string, plan: UserPlan) {
  const { token: accessToken, expiresIn } = signAccessToken(userId, email, plan);
  const { token: refreshToken, jti: refreshJti, ttlSeconds } = signRefreshToken(userId);

  // Store refresh JTI in Redis (single-use rotation)
  await storeRefreshToken(userId, refreshJti, ttlSeconds);

  return { accessToken, refreshToken, expiresIn };
}