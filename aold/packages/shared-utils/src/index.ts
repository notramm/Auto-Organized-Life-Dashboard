// ═══════════════════════════════════════════════════════════════
// @aold/shared-utils — Shared utilities across all services
// ═══════════════════════════════════════════════════════════════

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { ApiError, ApiSuccess, PaginatedResponse } from '@aold/shared-types';

// ── Logger ────────────────────────────────────────────────────────
export const createLogger = (service: string) =>
  pino({
    name: service,
    level: process.env.LOG_LEVEL ?? 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined,
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    base: { service, env: process.env.NODE_ENV },
  });

// ── Custom Error Classes ──────────────────────────────────────────
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super('NOT_FOUND', id ? `${resource} '${id}' not found` : `${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super('FORBIDDEN', message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class StorageQuotaError extends AppError {
  constructor() {
    super('STORAGE_QUOTA_EXCEEDED', 'Storage quota exceeded. Please upgrade your plan.', 413);
  }
}

// ── Response Helpers ──────────────────────────────────────────────
export const success = <T>(data: T, meta?: ApiSuccess<T>['meta']): ApiSuccess<T> => ({
  success: true,
  data,
  ...(meta && { meta }),
});

export const errorResponse = (
  code: string,
  message: string,
  requestId: string,
  details?: unknown,
): ApiError => ({
  success: false,
  error: { code, message, ...(details ? { details } : {}) },
  requestId,
});

export const paginated = <T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> => ({
  items,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

// ── ID Helpers ────────────────────────────────────────────────────
export const generateId = () => uuidv4();
export const generateRequestId = () => `req_${Date.now()}_${uuidv4().slice(0, 8)}`;

// ── Date Helpers ──────────────────────────────────────────────────
export const nowISO = () => new Date().toISOString();
export const daysFromNow = (days: number) => new Date(Date.now() + days * 86400_000).toISOString();
export const daysSince = (date: string | Date) =>
  (Date.now() - new Date(date).getTime()) / 86400_000;

// ── String Helpers ────────────────────────────────────────────────
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const truncate = (text: string, maxLength: number, suffix = '...') =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength - suffix.length)}${suffix}`;

export const sanitizeFilename = (filename: string) =>
  filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);

// ── File Helpers ──────────────────────────────────────────────────
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const getFileExtension = (filename: string) =>
  filename.split('.').pop()?.toLowerCase() ?? '';

// ── Async Helpers ─────────────────────────────────────────────────
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  delaysMs: number[],
): Promise<T> => {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts - 1) {
        await sleep(delaysMs[attempt] ?? delaysMs[delaysMs.length - 1]);
      }
    }
  }
  throw lastError;
};

export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new AppError('TIMEOUT', 'Operation timed out', 504)), timeoutMs),
    ),
  ]);

// ── Validation Helpers ────────────────────────────────────────────
export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// ── Search Scoring ─────────────────────────────────────────────────
export const computeRecencyScore = (createdAt: string, lambda = 0.01): number => {
  const days = daysSince(createdAt);
  return Math.exp(-lambda * days);
};

export const computeFinalScore = (
  vectorSimilarity: number,
  recencyScore: number,
  interactionBoost: number,
  weights = { vector: 0.7, recency: 0.2, interaction: 0.1 },
): number =>
  weights.vector * vectorSimilarity +
  weights.recency * recencyScore +
  weights.interaction * interactionBoost;