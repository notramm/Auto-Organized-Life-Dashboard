// apps/file-service/src/services/file.service.ts

import { PrismaClient, FileStatus, FileType, TagSource } from '@prisma/client';
import { createPresignedPutUrl, createPresignedGetUrl, getCdnUrl, s3Keys } from '../config/s3';
import { publishFileUploaded, publishFileDeleted } from '../config/kafka';
import { config } from '../config';
import {
  generateId, NotFoundError, ForbiddenError,
  ValidationError, StorageQuotaError, sanitizeFilename,
} from '@aold/shared-utils';
import type { PresignInput, ListFilesInput, UpdateFileInput } from '../schemas/file.schema';

const prisma = new PrismaClient();

const MIME_TO_FILETYPE: Record<string, FileType> = {
  'image/jpeg': FileType.IMAGE, 'image/png': FileType.IMAGE,
  'image/webp': FileType.IMAGE, 'image/gif': FileType.IMAGE,
  'image/heic': FileType.IMAGE, 'image/bmp': FileType.IMAGE,
  'video/mp4': FileType.VIDEO, 'video/quicktime': FileType.VIDEO,
  'video/x-msvideo': FileType.VIDEO, 'video/webm': FileType.VIDEO,
  'application/pdf': FileType.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileType.DOCUMENT,
  'text/plain': FileType.DOCUMENT, 'text/markdown': FileType.DOCUMENT,
};

// ── PRESIGN ───────────────────────────────────────────────────────
export async function presignUpload(userId: string, input: PresignInput) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { storageUsedBytes: true, storageQuotaBytes: true, plan: true },
  });
  if (!user) throw new NotFoundError('User');

  // Quota check
  if (Number(user.storageUsedBytes) + input.sizeBytes > Number(user.storageQuotaBytes)) {
    throw new StorageQuotaError();
  }

  // Per-file size limit
  const maxSize = user.plan === 'free' ? 500 * 1024 * 1024 : 2 * 1024 * 1024 * 1024;
  if (input.sizeBytes > maxSize) {
    throw new ValidationError(`File too large for ${user.plan} plan`);
  }

  // Validate folder ownership
  if (input.folderId) {
    const folder = await prisma.folder.findUnique({
      where: { id: input.folderId }, select: { userId: true },
    });
    if (!folder || folder.userId !== userId) throw new NotFoundError('Folder');
  }

  const fileId    = generateId();
  const chainId   = generateId();
  const safeName  = sanitizeFilename(input.filename);
  const fileType  = MIME_TO_FILETYPE[input.mimeType] ?? FileType.OTHER;
  const s3Key     = s3Keys.original(userId, fileId, safeName);

  await prisma.file.create({
    data: {
      id: fileId, userId,
      folderId:       input.folderId ?? null,
      name:           safeName,
      mimeType:       input.mimeType,
      fileType,
      sizeBytes:      BigInt(input.sizeBytes),
      s3Key,
      s3Bucket:       config.S3_BUCKET_NAME,
      status:         FileStatus.PENDING,
      versionChainId: chainId,
      versionNumber:  1,
      isLatest:       true,
    },
  });

  const uploadUrl = await createPresignedPutUrl(s3Key, input.mimeType);
  const expiresAt = new Date(Date.now() + config.S3_PRESIGN_EXPIRY_SECONDS * 1000).toISOString();

  return { fileId, uploadUrl, expiresAt };
}

// ── CONFIRM ───────────────────────────────────────────────────────
export async function confirmUpload(userId: string, fileId: string) {
  const file = await prisma.file.findUnique({
    where:  { id: fileId },
    select: { id: true, userId: true, s3Key: true, s3Bucket: true,
              mimeType: true, sizeBytes: true, fileType: true,
              folderId: true, status: true },
  });

  if (!file)                         throw new NotFoundError('File', fileId);
  if (file.userId !== userId)        throw new ForbiddenError('Access denied');
  if (file.status !== FileStatus.PENDING) throw new ValidationError('File not in PENDING state');

  await prisma.file.update({ where: { id: fileId }, data: { status: FileStatus.PROCESSING } });
  await prisma.user.update({ where: { id: userId }, data: { storageUsedBytes: { increment: file.sizeBytes } } });

  await prisma.fileAIMetadata.create({
    data: { fileId, detectedObjects: [], detectedScenes: [], detectedEntities: {} },
  });

  await publishFileUploaded({
    fileId, userId,
    s3Key:      file.s3Key,
    s3Bucket:   file.s3Bucket,
    mimeType:   file.mimeType,
    sizeBytes:  Number(file.sizeBytes),
    fileType:   file.fileType as any,
    folderId:   file.folderId ?? undefined,
    uploadedAt: new Date().toISOString(),
  });

  return { fileId, status: FileStatus.PROCESSING };
}

// ── LIST ──────────────────────────────────────────────────────────
export async function listFiles(userId: string, input: ListFilesInput) {
  const where: any = {
    userId, isDeleted: input.deleted, isLatest: true,
    ...(input.folderId && { folderId: input.folderId }),
    ...(input.fileType && { fileType: input.fileType }),
  };

  if (input.tags) {
    const tagList = input.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagList.length) where.tags = { some: { tagValue: { in: tagList } } };
  }

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      orderBy: { [input.sortBy]: input.sortOrder },
      skip:    (input.page - 1) * input.limit,
      take:    input.limit,
      include: {
        tags:      { select: { tagValue: true, source: true, confidence: true } },
        aiMetadata: { select: { description: true, summary: true } },
        preview:   { select: { thumbnailS3Key: true, cdnBaseUrl: true } },
      },
    }),
    prisma.file.count({ where }),
  ]);

  return {
    items: files.map((f) => ({
      ...f,
      sizeBytes:    Number(f.sizeBytes),
      thumbnailUrl: f.preview?.thumbnailS3Key ? getCdnUrl(f.preview.thumbnailS3Key) : null,
    })),
    total, page: input.page, limit: input.limit,
    totalPages: Math.ceil(total / input.limit),
  };
}

// ── GET ───────────────────────────────────────────────────────────
export async function getFile(userId: string, fileId: string) {
  const file = await prisma.file.findUnique({
    where:   { id: fileId },
    include: { tags: true, aiMetadata: true, preview: true },
  });

  if (!file || file.isDeleted)    throw new NotFoundError('File', fileId);
  if (file.userId !== userId)     throw new ForbiddenError('Access denied');

  const downloadUrl  = await createPresignedGetUrl(file.s3Key);
  const thumbnailUrl = file.preview?.thumbnailS3Key ? getCdnUrl(file.preview.thumbnailS3Key) : null;
  const previewUrl   = file.preview?.previewS3Key   ? getCdnUrl(file.preview.previewS3Key)   : null;

  return { ...file, sizeBytes: Number(file.sizeBytes), downloadUrl, thumbnailUrl, previewUrl };
}

// ── UPDATE ────────────────────────────────────────────────────────
export async function updateFile(userId: string, fileId: string, input: UpdateFileInput) {
  const file = await prisma.file.findUnique({ where: { id: fileId }, select: { id: true, userId: true } });
  if (!file)                   throw new NotFoundError('File', fileId);
  if (file.userId !== userId)  throw new ForbiddenError('Access denied');

  const updated = await prisma.file.update({
    where: { id: fileId },
    data:  {
      ...(input.name     && { name: sanitizeFilename(input.name) }),
      ...(input.folderId !== undefined && { folderId: input.folderId }),
    },
  });

  if (input.tags !== undefined) {
    await prisma.fileTag.deleteMany({ where: { fileId, source: TagSource.USER } });
    if (input.tags.length) {
      await prisma.fileTag.createMany({
        data: input.tags.map((tag) => ({
          id: generateId(), fileId, tagValue: `user:${tag}`, source: TagSource.USER,
        })),
        skipDuplicates: true,
      });
    }
  }

  return { ...updated, sizeBytes: Number(updated.sizeBytes) };
}

// ── DELETE (soft) ─────────────────────────────────────────────────
export async function deleteFile(userId: string, fileId: string) {
  const file = await prisma.file.findUnique({
    where:   { id: fileId },
    select:  { id: true, userId: true, sizeBytes: true,
               aiMetadata: { select: { pineconeVectorId: true } } },
  });
  if (!file)                   throw new NotFoundError('File', fileId);
  if (file.userId !== userId)  throw new ForbiddenError('Access denied');

  await prisma.file.update({ where: { id: fileId }, data: { isDeleted: true, deletedAt: new Date() } });
  await prisma.user.update({ where: { id: userId }, data: { storageUsedBytes: { decrement: file.sizeBytes } } });
  await publishFileDeleted({
    fileId, userId,
    pineconeVectorId: file.aiMetadata?.pineconeVectorId ?? undefined,
    deletedAt:        new Date().toISOString(),
  });

  return { fileId, deleted: true };
}

// ── RESTORE ───────────────────────────────────────────────────────
export async function restoreFile(userId: string, fileId: string) {
  const file = await prisma.file.findUnique({
    where:  { id: fileId },
    select: { id: true, userId: true, isDeleted: true, sizeBytes: true },
  });
  if (!file)                   throw new NotFoundError('File', fileId);
  if (file.userId !== userId)  throw new ForbiddenError('Access denied');
  if (!file.isDeleted)         throw new ValidationError('File is not deleted');

  await prisma.file.update({ where: { id: fileId }, data: { isDeleted: false, deletedAt: null } });
  await prisma.user.update({ where: { id: userId }, data: { storageUsedBytes: { increment: file.sizeBytes } } });

  return { fileId, restored: true };
}

// ── VERSIONS ──────────────────────────────────────────────────────
export async function listVersions(userId: string, fileId: string) {
  const file = await prisma.file.findUnique({
    where:  { id: fileId },
    select: { userId: true, versionChainId: true },
  });
  if (!file)                   throw new NotFoundError('File', fileId);
  if (file.userId !== userId)  throw new ForbiddenError('Access denied');

  const versions = await prisma.file.findMany({
    where:   { versionChainId: file.versionChainId, userId },
    orderBy: { versionNumber: 'desc' },
    select:  { id: true, versionNumber: true, isLatest: true, sizeBytes: true, createdAt: true },
  });

  return versions.map((v) => ({ ...v, sizeBytes: Number(v.sizeBytes) }));
}