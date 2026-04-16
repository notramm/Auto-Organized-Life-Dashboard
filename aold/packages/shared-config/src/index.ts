// ═══════════════════════════════════════════════════════════════
// @aold/shared-config — Centralized configuration constants
// ═══════════════════════════════════════════════════════════════

import { FileType } from '@aold/shared-types';

// ── Storage Limits ────────────────────────────────────────────────
export const STORAGE_LIMITS = {
  FREE_PLAN_BYTES: 5 * 1024 * 1024 * 1024,        // 5 GB
  PRO_PLAN_BYTES: 50 * 1024 * 1024 * 1024,         // 50 GB
  ENTERPRISE_PLAN_BYTES: 2 * 1024 * 1024 * 1024 * 1024, // 2 TB

  MAX_FILE_SIZE_FREE_BYTES: 500 * 1024 * 1024,     // 500 MB
  MAX_FILE_SIZE_PRO_BYTES: 2 * 1024 * 1024 * 1024, // 2 GB
  MULTIPART_THRESHOLD_BYTES: 10 * 1024 * 1024,     // 10 MB
} as const;

// ── Supported MIME Types ──────────────────────────────────────────
export const SUPPORTED_MIME_TYPES: Record<FileType, string[]> = {
  [FileType.IMAGE]: [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif', 'image/bmp', 'image/tiff',
  ],
  [FileType.VIDEO]: [
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'video/x-matroska', 'video/webm',
  ],
  [FileType.DOCUMENT]: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
  ],
  [FileType.OTHER]: [],
};

export const ALL_SUPPORTED_MIME_TYPES = Object.values(SUPPORTED_MIME_TYPES).flat();

export function getMimeTypeCategory(mimeType: string): FileType {
  for (const [fileType, mimes] of Object.entries(SUPPORTED_MIME_TYPES)) {
    if (mimes.includes(mimeType)) return fileType as FileType;
  }
  return FileType.OTHER;
}

// ── Rate Limits ───────────────────────────────────────────────────
export const RATE_LIMITS = {
  FREE_REQUESTS_PER_MINUTE: 100,
  PRO_REQUESTS_PER_MINUTE: 1000,
  ENTERPRISE_REQUESTS_PER_MINUTE: 10000,

  SEARCH_FREE_PER_MINUTE: 30,
  SEARCH_PRO_PER_MINUTE: 300,

  UPLOAD_FREE_PER_HOUR: 50,
  UPLOAD_PRO_PER_HOUR: 500,
} as const;

// ── Versioning ────────────────────────────────────────────────────
export const VERSIONING = {
  MAX_VERSIONS_FREE: 10,
  MAX_VERSIONS_PRO: -1, // unlimited
  TRASH_RETENTION_DAYS: 30,
} as const;

// ── AI Processing ─────────────────────────────────────────────────
export const AI_CONFIG = {
  EMBEDDING_MODEL: 'text-embedding-3-small',
  EMBEDDING_DIMENSIONS: 1536,

  MAX_TOKENS_FOR_SUMMARY: 4000,
  CHUNK_SIZE_TOKENS: 512,
  CHUNK_OVERLAP_TOKENS: 50,

  VIDEO_FRAME_EXTRACTION_FPS: 1,
  VIDEO_MAX_FRAMES: 60,
  VIDEO_PREVIEW_DURATION_SECONDS: 15,
  VIDEO_PREVIEW_RESOLUTION: '640:-1', // FFmpeg scale filter

  IMAGE_THUMBNAIL_SIZE: 200,  // px (square)
  DOC_PREVIEW_WIDTH: 800,     // px

  AI_TAG_CONFIDENCE_THRESHOLD: 0.65, // tags below this are excluded
  AI_PROCESSING_TIMEOUT_MS: 120_000, // 2 minutes
} as const;

// ── Search ────────────────────────────────────────────────────────
export const SEARCH_CONFIG = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
  PINECONE_CANDIDATES: 50,
  CACHE_TTL_SECONDS: 300, // 5 minutes
  QUERY_DEBOUNCE_MS: 300,

  // Reranking weights (must sum to 1)
  VECTOR_WEIGHT: 0.70,
  RECENCY_WEIGHT: 0.20,
  INTERACTION_WEIGHT: 0.10,
  RECENCY_DECAY_LAMBDA: 0.01,
} as const;

// ── Kafka ─────────────────────────────────────────────────────────
export const KAFKA_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAYS_MS: [5_000, 30_000, 300_000], // 5s, 30s, 5min
  SESSION_TIMEOUT_MS: 30_000,
  HEARTBEAT_INTERVAL_MS: 3_000,
} as const;

// ── Cache TTLs (seconds) ──────────────────────────────────────────
export const CACHE_TTL = {
  SEARCH_RESULTS: 300,
  FILE_METADATA: 1800,
  USER_PROFILE: 900,
  JWT_PUBLIC_KEY: 3600,
  PRESIGN_URL: 3600,
} as const;

// ── S3 ────────────────────────────────────────────────────────────
export const S3_CONFIG = {
  PRESIGN_EXPIRY_SECONDS: 3600,
  CDN_CACHE_CONTROL_THUMBNAIL: 'public, max-age=86400',    // 24h
  CDN_CACHE_CONTROL_PREVIEW: 'public, max-age=3600',       // 1h
  CDN_CACHE_CONTROL_ORIGINAL: 'private, max-age=300',      // 5min (signed URL)

  KEY_PREFIX: {
    ORIGINALS: 'originals',
    THUMBNAILS: 'thumbnails',
    PREVIEWS: 'previews',
    TEMP: 'temp',
  },
} as const;