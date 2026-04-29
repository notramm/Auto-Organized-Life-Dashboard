// apps/search-service/src/schemas/search.schema.ts
import { z } from 'zod';
import { FileType } from '@aold/shared-types';

export const searchSchema = z.object({
  q:        z.string().min(1).max(500).trim(),
  fileType: z.nativeEnum(FileType).optional(),
  from:     z.string().optional(),
  to:       z.string().optional(),
  tags:     z.string().optional(),
  folderId: z.string().uuid().optional(),
  limit:    z.coerce.number().min(1).max(50).default(10),
  offset:   z.coerce.number().min(0).default(0),
});

export const feedbackSchema = z.object({
  query:      z.string().min(1),
  fileId:     z.string().uuid(),
  actionType: z.enum(['click', 'download', 'share']),
});

export const suggestionsSchema = z.object({
  q: z.string().min(1).max(100).trim(),
});

export type SearchInput      = z.infer<typeof searchSchema>;
export type FeedbackInput    = z.infer<typeof feedbackSchema>;
export type SuggestionsInput = z.infer<typeof suggestionsSchema>;