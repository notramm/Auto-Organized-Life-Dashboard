// apps/insights-service/src/services/insights.service.ts

import { PrismaClient } from '@prisma/client';
import OpenAI           from 'openai';
import { config }       from '../config';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

// ── Get insights for user (paginated) ────────────────────────────
export async function getInsights(userId: string, page = 1, limit = 20) {
  const [items, total] = await Promise.all([
    prisma.insightItem.findMany({
      where:   { userId, isDismissed: false },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.insightItem.count({ where: { userId, isDismissed: false } }),
  ]);

  const unreadCount = await prisma.insightItem.count({
    where: { userId, isRead: false, isDismissed: false },
  });

  return { items, total, page, limit, totalPages: Math.ceil(total / limit), unreadCount };
}

// ── Mark insight as read ──────────────────────────────────────────
export async function markAsRead(userId: string, insightId: string) {
  return prisma.insightItem.updateMany({
    where: { id: insightId, userId },
    data:  { isRead: true },
  });
}

// ── Mark all as read ──────────────────────────────────────────────
export async function markAllRead(userId: string) {
  return prisma.insightItem.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true },
  });
}

// ── Dismiss insight ───────────────────────────────────────────────
export async function dismissInsight(userId: string, insightId: string) {
  return prisma.insightItem.updateMany({
    where: { id: insightId, userId },
    data:  { isDismissed: true },
  });
}

// ── Generate daily digest for user ───────────────────────────────
export async function generateDailyDigest(userId: string): Promise<void> {
  const yesterday = new Date(Date.now() - 86400_000);

  // Get recent files
  const recentFiles = await prisma.file.findMany({
    where:   { userId, isDeleted: false, isLatest: true, createdAt: { gte: yesterday } },
    include: { tags: { select: { tagValue: true } } },
    orderBy: { createdAt: 'desc' },
    take:    20,
  });

  // Get storage info
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { storageUsedBytes: true, storageQuotaBytes: true, fullName: true },
  });
  if (!user) return;

  const usedPct  = Math.round((Number(user.storageUsedBytes) / Number(user.storageQuotaBytes)) * 100);
  const fileCount = recentFiles.length;

  // Build digest description
  let description = '';
  if (fileCount === 0) {
    description = `No new files uploaded today. Storage: ${usedPct}% used.`;
  } else {
    const types: Record<string, number> = {};
    recentFiles.forEach((f) => {
      types[f.fileType] = (types[f.fileType] ?? 0) + 1;
    });
    const typeSummary = Object.entries(types)
      .map(([t, n]) => `${n} ${t.toLowerCase()}${n > 1 ? 's' : ''}`)
      .join(', ');
    description = `${fileCount} new file${fileCount > 1 ? 's' : ''} added today: ${typeSummary}. Storage: ${usedPct}% used.`;
  }

  // Create/update today's digest (upsert by type + date)
  const today = new Date().toISOString().split('T')[0];
  const existingDigest = await prisma.insightItem.findFirst({
    where: { userId, type: 'digest', createdAt: { gte: new Date(today) } },
  });

  if (existingDigest) {
    await prisma.insightItem.update({
      where: { id: existingDigest.id },
      data:  { description, title: `Today's Summary — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` },
    });
  } else {
    await prisma.insightItem.create({
      data: {
        userId,
        type:        'digest',
        title:       `Today's Summary — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        description,
        fileIds:     recentFiles.map((f) => f.id),
        priority:    'low',
        expiresAt:   new Date(Date.now() + 86400_000 * 2), // 2 days
      },
    });
  }
}

// ── Extract reminders from document content ───────────────────────
export async function generateReminders(userId: string): Promise<void> {
  // Find docs with dates in entities that don't have reminders yet
  const docs = await prisma.fileAIMetadata.findMany({
    where: {
      file: { userId, fileType: 'DOCUMENT', isDeleted: false },
      detectedEntities: { path: ['dates'], array_contains: [] },
      pineconeVectorId: { not: null }, // only processed files
    },
    include: { file: { select: { id: true, name: true } } },
    take: 20,
  });

  for (const doc of docs) {
    const entities = doc.detectedEntities as any;
    const dates    = (entities?.dates ?? []) as string[];
    if (!dates.length) continue;

    // Find future dates
    const futureDates = dates.filter((d) => {
      try { return new Date(d) > new Date(); } catch { return false; }
    });
    if (!futureDates.length) continue;

    // Check reminder doesn't already exist for this file
    const existing = await prisma.insightItem.findFirst({
      where: { userId, type: 'reminder', fileIds: { array_contains: [doc.fileId] } },
    });
    if (existing) continue;

    const nearestDate = futureDates.sort()[0];
    const daysUntil   = Math.ceil((new Date(nearestDate).getTime() - Date.now()) / 86400_000);

    await prisma.insightItem.create({
      data: {
        userId,
        type:        'reminder',
        title:       `Date found in "${doc.file.name}"`,
        description: `Document contains a date: ${nearestDate} — ${daysUntil} days from now.`,
        fileIds:     [doc.fileId],
        priority:    daysUntil <= 7 ? 'high' : daysUntil <= 30 ? 'medium' : 'low',
        dueDate:     new Date(nearestDate),
      },
    });
  }
}

// ── Generate contextual groups ────────────────────────────────────
export async function generateGroups(userId: string): Promise<void> {
  // Find clusters of files with common AI tags
  const tagGroups = await prisma.$queryRaw<Array<{ tagValue: string; count: bigint }>>`
    SELECT ft.tag_value, COUNT(*) as count
    FROM file_tags ft
    JOIN files f ON f.id = ft.file_id
    WHERE f.user_id = ${userId}
      AND f.is_deleted = false
      AND ft.source = 'AI'
      AND ft.tag_value NOT IN ('ai:image', 'ai:video', 'ai:document')
    GROUP BY ft.tag_value
    HAVING COUNT(*) >= 3
    ORDER BY count DESC
    LIMIT 5
  `;

  for (const group of tagGroups) {
    const tag   = group.tagValue;
    const label = tag.replace('ai:', '');
    const count = Number(group.count);

    // Check if group insight already exists
    const existing = await prisma.insightItem.findFirst({
      where: { userId, type: 'group', title: { contains: label } },
    });
    if (existing) continue;

    // Get file IDs for this tag
    const taggedFiles = await prisma.fileTag.findMany({
      where:  { tagValue: tag, file: { userId, isDeleted: false, isLatest: true } },
      select: { fileId: true },
      take:   10,
    });

    await prisma.insightItem.create({
      data: {
        userId,
        type:        'group',
        title:       `${count} files tagged "${label}"`,
        description: `AOLD found ${count} files related to "${label}". Want to create a folder or album for these?`,
        fileIds:     taggedFiles.map((t) => t.fileId),
        priority:    'low',
      },
    });
  }
}

// ── Get storage stats for user ────────────────────────────────────
export async function getStorageStats(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { storageUsedBytes: true, storageQuotaBytes: true, plan: true },
  });
  if (!user) return null;

  const byType = await prisma.file.groupBy({
    by:     ['fileType'],
    where:  { userId, isDeleted: false, isLatest: true },
    _sum:   { sizeBytes: true },
    _count: { id: true },
  });

  return {
    usedBytes:   Number(user.storageUsedBytes),
    quotaBytes:  Number(user.storageQuotaBytes),
    usedPercent: Math.round((Number(user.storageUsedBytes) / Number(user.storageQuotaBytes)) * 100),
    plan:        user.plan,
    byType:      byType.map((b) => ({
      fileType:  b.fileType,
      bytes:     Number(b._sum.sizeBytes ?? 0),
      count:     b._count.id,
    })),
  };
}