// apps/search-service/src/services/search.service.ts
import { PrismaClient }   from '@prisma/client';
import { getIndex }       from '../config/pinecone';
import {
  buildCacheKey, getCachedResult, setCachedResult,
  saveQueryForAutocomplete,
} from '../config/redis';
import { embedQuery, extractQueryIntent } from './embed.service';
import { publishSearchPerformed }         from '../config/kafka';
import type { SearchInput }               from '../schemas/search.schema';

const prisma = new PrismaClient();
const WEIGHTS        = { vector: 0.70, recency: 0.20, interaction: 0.10 };
const RECENCY_LAMBDA = 0.01;

export interface SearchResultItem {
  fileId: string; fileName: string; fileType: string; mimeType: string;
  thumbnailUrl: string | null; matchReason: string; score: number;
  tags: string[]; createdAt: string;
}

export interface SearchResponse {
  query: string; results: SearchResultItem[]; total: number; tookMs: number;
}

export async function search(userId: string, input: SearchInput): Promise<SearchResponse> {
  const start = Date.now();

  // Cache check
  const cacheKey = buildCacheKey(userId, input.q, {
    fileType: input.fileType, from: input.from, to: input.to, tags: input.tags,
  });
  const cached = await getCachedResult(cacheKey);
  if (cached) return JSON.parse(cached) as SearchResponse;

  // Embed + intent
  const { cleanedQuery, fileTypeHint } = await extractQueryIntent(input.q);
  const effectiveType = input.fileType ?? fileTypeHint ?? undefined;
  const queryVector   = await embedQuery(cleanedQuery);

  // Pinecone search
  const candidates = await _pineconeSearch(userId, queryVector, effectiveType, 50);
  if (!candidates.length) return { query: input.q, results: [], total: 0, tookMs: Date.now() - start };

  // DB + rerank
  const files    = await _fetchFiles(userId, candidates.map((c) => c.fileId), input);
  const reranked = _rerank(candidates, files);
  const sliced   = reranked.slice(input.offset, input.offset + input.limit);
  const results  = sliced.map(_formatResult);

  const response: SearchResponse = {
    query: input.q, results, total: reranked.length, tookMs: Date.now() - start,
  };

  await setCachedResult(cacheKey, JSON.stringify(response));
  void saveQueryForAutocomplete(userId, input.q);
  void _logSearch(userId, input.q, results.length, Date.now() - start, effectiveType);
  void publishSearchPerformed({
    userId, query: input.q, resultCount: results.length,
    latencyMs: Date.now() - start, fileType: effectiveType,
  });

  return response;
}

async function _pineconeSearch(
  userId: string, vector: number[], fileType: string | undefined, topK: number,
) {
  const index  = getIndex();
  const filter: Record<string, unknown> = {};
  if (fileType) filter['fileType'] = { $eq: fileType };

  const res = await index.namespace(userId).query({
    vector, topK, includeMetadata: true,
    filter: Object.keys(filter).length ? filter : undefined,
  });

  return (res.matches ?? []).map((m) => ({
    fileId: (m.metadata?.['fileId'] as string) ?? m.id,
    score:  m.score ?? 0,
  }));
}

async function _fetchFiles(userId: string, fileIds: string[], input: SearchInput) {
  const where: Record<string, unknown> = {
    id: { in: fileIds }, userId, isDeleted: false, isLatest: true,
    ...(input.from || input.to ? { createdAt: {
      ...(input.from && { gte: new Date(input.from) }),
      ...(input.to   && { lte: new Date(input.to)   }),
    }} : {}),
  };
  if (input.tags) {
    const tagList = input.tags.split(',').map((t) => t.trim());
    if (tagList.length) where['tags'] = { some: { tagValue: { in: tagList } } };
  }
  return prisma.file.findMany({
    where: where as any,
    include: {
      tags:    { select: { tagValue: true } },
      preview: { select: { thumbnailS3Key: true, cdnBaseUrl: true } },
    },
  });
}

function _rerank(
  candidates: Array<{ fileId: string; score: number }>,
  files:      Awaited<ReturnType<typeof _fetchFiles>>,
) {
  const fileMap  = new Map(files.map((f) => [f.id, f]));
  const maxScore = Math.max(...candidates.map((c) => c.score), 1);

  return candidates
    .filter((c) => fileMap.has(c.fileId))
    .map((c) => {
      const file         = fileMap.get(c.fileId)!;
      const vectorScore  = c.score / maxScore;
      const daysAgo      = (Date.now() - file.createdAt.getTime()) / 86400_000;
      const recencyScore = Math.exp(-RECENCY_LAMBDA * daysAgo);
      const finalScore   = WEIGHTS.vector * vectorScore + WEIGHTS.recency * recencyScore;
      return { fileId: c.fileId, vectorScore, finalScore, file };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}

function _formatResult(r: {
  fileId: string; vectorScore: number; finalScore: number; file: any;
}): SearchResultItem {
  const { file } = r;
  const aiTags   = (file.tags as { tagValue: string }[])
    .filter((t) => t.tagValue.startsWith('ai:'))
    .map((t)    => t.tagValue.replace('ai:', ''))
    .slice(0, 3);

  return {
    fileId:       file.id,
    fileName:     file.name,
    fileType:     file.fileType,
    mimeType:     file.mimeType,
    thumbnailUrl: file.preview?.thumbnailS3Key
      ? `${file.preview.cdnBaseUrl ?? ''}/${file.preview.thumbnailS3Key}` : null,
    matchReason:  aiTags.length ? `Matched: ${aiTags.join(', ')}` : 'Semantic match',
    score:        Math.round(r.finalScore * 1000) / 1000,
    tags:         (file.tags as { tagValue: string }[]).map((t) => t.tagValue),
    createdAt:    file.createdAt.toISOString(),
  };
}

async function _logSearch(
  userId: string, query: string, resultCount: number,
  latencyMs: number, fileType?: string,
) {
  try {
    await prisma.searchLog.create({
      data: { userId, queryText: query, resultCount, clickedFileIds: [], latencyMs, fileTypeFilter: fileType ?? null },
    });
  } catch { /* non-critical */ }
}

export async function logClickFeedback(
  userId: string, query: string, fileId: string,
): Promise<void> {
  try {
    const log = await prisma.searchLog.findFirst({
      where: { userId, queryText: query }, orderBy: { createdAt: 'desc' },
    });
    if (log) {
      await prisma.searchLog.update({
        where: { id: log.id },
        data:  { clickedFileIds: [...(log.clickedFileIds as string[]), fileId] },
      });
    }
  } catch { /* non-critical */ }
}