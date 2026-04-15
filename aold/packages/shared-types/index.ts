// ═══════════════════════════════════════════════════════════════
// @aold/shared-types — Single source of truth for all types
// Used by every service and the frontend
// ═══════════════════════════════════════════════════════════════

// ── Enums ────────────────────────────────────────────────────────
export enum UserPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum FileStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  ERROR = 'ERROR',
}

export enum FileType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  OTHER = 'OTHER',
}

export enum TagSource {
  AI = 'AI',
  USER = 'USER',
}

// ── User ─────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  plan: UserPlan;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithoutSensitive extends Omit<User, 'storageUsedBytes' | 'storageQuotaBytes'> {
  storageUsedBytes: number;
  storageQuotaBytes: number;
  storageUsedPercent: number;
}

// ── Auth ─────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  expiresIn: number; // seconds
}

export interface JWTPayload {
  sub: string; // userId
  email: string;
  plan: UserPlan;
  iat: number;
  exp: number;
  jti: string; // token ID for revocation
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ── File ─────────────────────────────────────────────────────────
export interface FileRecord {
  id: string;
  userId: string;
  folderId?: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  fileType: FileType;
  s3Key: string;
  s3Bucket: string;
  status: FileStatus;
  versionChainId: string;
  versionNumber: number;
  isLatest: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // relations (optional, populated by joins)
  tags?: FileTag[];
  aiMetadata?: FileAIMetadata;
  preview?: FilePreview;
}

export interface FileTag {
  id: string;
  fileId: string;
  tagValue: string;
  source: TagSource;
  confidence?: number;
  createdAt: string;
}

export interface FileAIMetadata {
  fileId: string;
  description?: string;
  summary?: string;
  transcript?: string;
  ocrText?: string;
  detectedObjects: DetectedObject[];
  detectedScenes: DetectedScene[];
  detectedEntities: DetectedEntities;
  pineconeVectorId?: string;
  processingDurationMs?: number;
  processedAt?: string;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  bbox?: [number, number, number, number]; // [x, y, width, height] normalized
}

export interface DetectedScene {
  label: string;
  confidence: number;
}

export interface DetectedEntities {
  people: string[];
  organizations: string[];
  dates: string[];
  amounts: string[];
  locations: string[];
}

export interface FilePreview {
  fileId: string;
  thumbnailUrl: string; // 200x200
  previewUrl: string;   // 800px / 15s clip / page-1
  generatedAt: string;
}

export interface Folder {
  id: string;
  userId: string;
  parentId?: string;
  name: string;
  path: string;
  isSmart: boolean;
  smartRule?: SmartFolderRule;
  createdAt: string;
  updatedAt: string;
  // UI helper
  children?: Folder[];
  fileCount?: number;
}

export interface SmartFolderRule {
  tags?: string[];
  fileTypes?: FileType[];
  dateRange?: { from: string; to: string };
  mimeTypes?: string[];
}

// ── File Upload ───────────────────────────────────────────────────
export interface PresignRequest {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  folderId?: string;
}

export interface PresignResponse {
  fileId: string;
  uploadUrl: string;
  fields: Record<string, string>; // S3 form fields
  expiresAt: string;
}

export interface ConfirmUploadRequest {
  checksum?: string; // optional MD5 for integrity verification
}

// ── Search ────────────────────────────────────────────────────────
export interface SearchRequest {
  query: string;
  fileType?: FileType;
  from?: string;      // ISO date
  to?: string;        // ISO date
  tags?: string[];
  folderId?: string;
  limit?: number;     // default 10
  offset?: number;    // default 0
}

export interface SearchResult {
  fileId: string;
  fileName: string;
  fileType: FileType;
  mimeType: string;
  thumbnailUrl?: string;
  matchReason: string;
  score: number;
  createdAt: string;
  tags: string[];
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  tookMs: number;
}

// ── Insights ──────────────────────────────────────────────────────
export interface InsightItem {
  id: string;
  type: 'reminder' | 'suggestion' | 'group' | 'digest';
  title: string;
  description: string;
  fileIds?: string[];
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
}

// ── Kafka Events ──────────────────────────────────────────────────
export interface KafkaEvent<T = unknown> {
  eventId: string;
  eventType: string;
  timestamp: string;
  payload: T;
}

export interface FileUploadedPayload {
  fileId: string;
  userId: string;
  s3Key: string;
  s3Bucket: string;
  mimeType: string;
  sizeBytes: number;
  fileType: FileType;
  folderId?: string;
  uploadedAt: string;
}

export interface FileProcessedPayload {
  fileId: string;
  userId: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  tags: string[];
  pineconeVectorId?: string;
  previewGenerated: boolean;
  processingDurationMs: number;
  processedAt: string;
  error?: string;
}

export interface EmbeddingCreatedPayload {
  fileId: string;
  userId: string;
  pineconeVectorId: string;
  dimensions: number;
  createdAt: string;
}

export interface FileDeletedPayload {
  fileId: string;
  userId: string;
  pineconeVectorId?: string;
  deletedAt: string;
}

export const KAFKA_TOPICS = {
  FILE_UPLOADED: 'file.uploaded',
  FILE_PROCESSED: 'file.processed',
  FILE_PROCESSING_FAILED: 'file.processing-failed',
  EMBEDDING_CREATED: 'embedding.created',
  SEARCH_PERFORMED: 'search.performed',
  FILE_DELETED: 'file.deleted',
  USER_EVENTS: 'user.events',
  INSIGHTS_TRIGGERS: 'insights.triggers',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

// ── API Standard Response Wrappers ────────────────────────────────
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Pagination ────────────────────────────────────────────────────
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}