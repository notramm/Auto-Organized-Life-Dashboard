// apps/file-service/src/schemas/file.schema.ts

import { z } from 'zod';
import { FileType } from '@aold/shared-types';

const MAX_FREE_BYTES = 500 * 1024 * 1024;   // 500 MB
const MAX_PRO_BYTES  = 2 * 1024 * 1024 * 1024; // 2 GB

const SUPPORTED_MIMES = [
  'image/jpeg','image/png','image/webp','image/gif','image/heic','image/bmp',
  'video/mp4','video/quicktime','video/x-msvideo','video/webm',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain','text/markdown','text/csv',
];

export const presignSchema = z.object({
  filename:  z.string().min(1).max(512).trim(),
  mimeType:  z.string().refine((v) => SUPPORTED_MIMES.includes(v), {
    message: 'Unsupported file type',
  }),
  sizeBytes: z.number().positive().max(MAX_PRO_BYTES, 'File too large'),
  folderId:  z.string().uuid().optional(),
});

export const confirmUploadSchema = z.object({
  checksum: z.string().optional(),
});

export const listFilesSchema = z.object({
  folderId:  z.string().uuid().optional(),
  fileType:  z.nativeEnum(FileType).optional(),
  tags:      z.string().optional(),
  page:      z.coerce.number().min(1).default(1),
  limit:     z.coerce.number().min(1).max(100).default(20),
  sortBy:    z.enum(['createdAt','name','sizeBytes']).default('createdAt'),
  sortOrder: z.enum(['asc','desc']).default('desc'),
  deleted:   z.coerce.boolean().default(false),
});

export const updateFileSchema = z.object({
  name:     z.string().min(1).max(512).trim().optional(),
  folderId: z.string().uuid().nullable().optional(),
  tags:     z.array(z.string().max(100)).max(50).optional(),
});

export const createFolderSchema = z.object({
  name:     z.string().min(1).max(255).trim(),
  parentId: z.string().uuid().optional(),
});

export const updateFolderSchema = z.object({
  name:     z.string().min(1).max(255).trim().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export type PresignInput       = z.infer<typeof presignSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
export type ListFilesInput     = z.infer<typeof listFilesSchema>;
export type UpdateFileInput    = z.infer<typeof updateFileSchema>;
export type CreateFolderInput  = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput  = z.infer<typeof updateFolderSchema>;