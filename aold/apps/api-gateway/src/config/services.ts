// ── Service Registry ─────────────────────────────────────────────
// Central map of all downstream microservices.
// Add new services here — the proxy plugin reads from this.

import { config } from '../config';
import type { UserPlan } from '@aold/shared-types';
import type { } from '@aold/shared-config';

const RATE_LIMITS = {
  FREE_REQUESTS_PER_MINUTE: 100,
  PRO_REQUESTS_PER_MINUTE: 1000,
  ENTERPRISE_REQUESTS_PER_MINUTE: 10000,
};

export interface ServiceDefinition {
  url: string;
  prefix: string;       // path prefix this service handles
  requiresAuth: boolean;
  description: string;
}

export const services: ServiceDefinition[] = [
  {
    url: config.AUTH_SERVICE_URL,
    prefix: '/api/auth',
    requiresAuth: false, // auth routes handle their own auth
    description: 'Authentication & user management',
  },
  {
    url: config.FILE_SERVICE_URL,
    prefix: '/api/files',
    requiresAuth: true,
    description: 'File upload, storage, folders, tags',
  },
  {
    url: config.FILE_SERVICE_URL,
    prefix: '/api/folders',
    requiresAuth: true,
    description: 'Folder management',
  },
  {
    url: config.SEARCH_SERVICE_URL,
    prefix: '/api/search',
    requiresAuth: true,
    description: 'Semantic search',
  },
  {
    url: config.INSIGHTS_SERVICE_URL,
    prefix: '/api/insights',
    requiresAuth: true,
    description: 'AI insights and reminders',
  },
  {
    url: config.NOTIFICATION_SERVICE_URL,
    prefix: '/api/notifications',
    requiresAuth: true,
    description: 'Notification preferences',
  },
];

// ── Rate limit tiers by plan ──────────────────────────────────────
export function getRateLimitForPlan(plan?: string): number {
  switch (plan) {
    case UserPlan.ENTERPRISE:
      return RATE_LIMITS.ENTERPRISE_REQUESTS_PER_MINUTE;
    case UserPlan.PRO:
      return RATE_LIMITS.PRO_REQUESTS_PER_MINUTE;
    default:
      return RATE_LIMITS.FREE_REQUESTS_PER_MINUTE;
  }
}

// Routes that are completely public — no JWT needed, no rate limit
export const PUBLIC_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/oauth/google',
  '/api/auth/oauth/google/callback',
  '/healthz',
  '/api/health',
]);

// Routes that require auth but bypass per-user rate limit (internal)
export const SKIP_RATE_LIMIT_PATHS = new Set(['/healthz']);