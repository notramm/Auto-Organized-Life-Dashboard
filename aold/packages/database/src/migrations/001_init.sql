-- packages/database/src/migrations/001_init.sql
-- Run this manually OR let Prisma generate it via: npx prisma migrate dev --name init
-- This file is the raw SQL equivalent of the Prisma schema for reference.

-- ── Extensions ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- full-text search
CREATE EXTENSION IF NOT EXISTS "ltree";     -- folder path queries

-- ── Enums ─────────────────────────────────────────────────────────
CREATE TYPE "UserPlan"   AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'ERROR');
CREATE TYPE "FileType"   AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'OTHER');
CREATE TYPE "TagSource"  AS ENUM ('AI', 'USER');

-- ── users ─────────────────────────────────────────────────────────
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email               VARCHAR(320) NOT NULL,
  password_hash       VARCHAR(255),
  full_name           VARCHAR(255) NOT NULL,
  avatar_url          VARCHAR(1024),
  plan                "UserPlan"   NOT NULL DEFAULT 'free',
  storage_used_bytes  BIGINT       NOT NULL DEFAULT 0,
  storage_quota_bytes BIGINT       NOT NULL DEFAULT 5368709120,
  email_verified      BOOLEAN      NOT NULL DEFAULT FALSE,
  two_factor_enabled  BOOLEAN      NOT NULL DEFAULT FALSE,
  two_factor_secret   VARCHAR(255),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_email ON users (email);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── oauth_accounts ────────────────────────────────────────────────
CREATE TABLE oauth_accounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider      VARCHAR(50)  NOT NULL,
  provider_id   VARCHAR(255) NOT NULL,
  access_token  TEXT,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT oauth_accounts_provider_unique UNIQUE (provider, provider_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts (user_id);

-- ── user_sessions ─────────────────────────────────────────────────
CREATE TABLE user_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti         VARCHAR(255) NOT NULL,
  user_agent  TEXT,
  ip_address  VARCHAR(45),
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT user_sessions_jti_unique UNIQUE (jti)
);

CREATE INDEX idx_user_sessions_user_id  ON user_sessions (user_id);
CREATE INDEX idx_user_sessions_jti      ON user_sessions (jti);
CREATE INDEX idx_user_sessions_expires  ON user_sessions (expires_at);

-- ── folders ───────────────────────────────────────────────────────
CREATE TABLE folders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id   UUID         REFERENCES folders(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  path        TEXT         NOT NULL DEFAULT '',
  is_smart    BOOLEAN      NOT NULL DEFAULT FALSE,
  smart_rule  JSONB,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_folders_user_id          ON folders (user_id);
CREATE INDEX idx_folders_user_parent      ON folders (user_id, parent_id);
CREATE INDEX idx_folders_path             ON folders (path);

CREATE TRIGGER folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── files ─────────────────────────────────────────────────────────
CREATE TABLE files (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id        UUID         REFERENCES folders(id) ON DELETE SET NULL,
  name             VARCHAR(512) NOT NULL,
  mime_type        VARCHAR(127) NOT NULL,
  file_type        "FileType"   NOT NULL,
  size_bytes       BIGINT       NOT NULL,
  s3_key           VARCHAR(1024) NOT NULL,
  s3_bucket        VARCHAR(255) NOT NULL,
  status           "FileStatus" NOT NULL DEFAULT 'PENDING',
  version_chain_id UUID         NOT NULL,
  version_number   INTEGER      NOT NULL DEFAULT 1,
  is_latest        BOOLEAN      NOT NULL DEFAULT TRUE,
  is_deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_user_created      ON files (user_id, created_at DESC);
CREATE INDEX idx_files_user_folder       ON files (user_id, folder_id);
CREATE INDEX idx_files_version_chain     ON files (version_chain_id, is_latest);
CREATE INDEX idx_files_user_deleted      ON files (user_id, is_deleted);
CREATE INDEX idx_files_user_type         ON files (user_id, file_type);
CREATE INDEX idx_files_status            ON files (status);
-- Full-text index on name for hybrid search
CREATE INDEX idx_files_name_trgm         ON files USING GIN (name gin_trgm_ops);

CREATE TRIGGER files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── file_tags ─────────────────────────────────────────────────────
CREATE TABLE file_tags (
  id          UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id     UUID       NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  tag_value   VARCHAR(255) NOT NULL,
  source      "TagSource" NOT NULL,
  confidence  FLOAT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT file_tags_unique UNIQUE (file_id, tag_value)
);

CREATE INDEX idx_file_tags_file_id   ON file_tags (file_id);
CREATE INDEX idx_file_tags_tag_value ON file_tags (tag_value);

-- ── file_ai_metadata ──────────────────────────────────────────────
CREATE TABLE file_ai_metadata (
  file_id                UUID    PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
  description            TEXT,
  summary                TEXT,
  transcript             TEXT,
  ocr_text               TEXT,
  detected_objects       JSONB   NOT NULL DEFAULT '[]',
  detected_scenes        JSONB   NOT NULL DEFAULT '[]',
  detected_entities      JSONB   NOT NULL DEFAULT '{}',
  pinecone_vector_id     VARCHAR(255),
  processing_duration_ms INTEGER,
  processed_at           TIMESTAMPTZ,
  retry_count            INTEGER NOT NULL DEFAULT 0,
  last_error             TEXT
);

-- GIN index for searching inside JSONB detected objects/scenes
CREATE INDEX idx_ai_metadata_objects ON file_ai_metadata USING GIN (detected_objects);
CREATE INDEX idx_ai_metadata_scenes  ON file_ai_metadata USING GIN (detected_scenes);

-- ── file_previews ─────────────────────────────────────────────────
CREATE TABLE file_previews (
  file_id          UUID PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
  thumbnail_s3_key VARCHAR(1024),
  preview_s3_key   VARCHAR(1024),
  cdn_base_url     VARCHAR(1024),
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── search_logs ───────────────────────────────────────────────────
CREATE TABLE search_logs (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_text        TEXT        NOT NULL,
  result_count      INTEGER     NOT NULL DEFAULT 0,
  clicked_file_ids  UUID[]      NOT NULL DEFAULT '{}',
  latency_ms        INTEGER,
  file_type_filter  VARCHAR(50),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_logs_user_id ON search_logs (user_id, created_at DESC);

-- ── insight_items ─────────────────────────────────────────────────
CREATE TABLE insight_items (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL,
  title        VARCHAR(500) NOT NULL,
  description  TEXT        NOT NULL,
  file_ids     UUID[]      NOT NULL DEFAULT '{}',
  priority     VARCHAR(20) NOT NULL DEFAULT 'medium',
  due_date     TIMESTAMPTZ,
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ
);

CREATE INDEX idx_insights_user_unread ON insight_items (user_id, is_read);
CREATE INDEX idx_insights_user_date   ON insight_items (user_id, created_at DESC);

-- ── audit_logs ────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        NOT NULL,
  action        VARCHAR(100) NOT NULL,
  resource_id   UUID,
  resource_type VARCHAR(50),
  metadata      JSONB,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_date ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource  ON audit_logs (resource_id);