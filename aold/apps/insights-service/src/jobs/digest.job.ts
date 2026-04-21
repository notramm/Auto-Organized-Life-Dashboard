// apps/insights-service/src/jobs/digest.job.ts
// Runs every day at 7am — generates digests for all users

import cron             from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { generateDailyDigest, generateReminders, generateGroups } from '../services/insights.service';

const prisma = new PrismaClient();

export function startDigestJob(): void {
  // Every day at 7:00 AM server time
  cron.schedule('0 7 * * *', async () => {
    console.info('[Digest Job] Starting daily digest generation...');

    try {
      // Process users in batches of 50
      let cursor: string | undefined;
      let processed = 0;

      while (true) {
        const users = await prisma.user.findMany({
          select: { id: true },
          take:   50,
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
          orderBy: { id: 'asc' },
        });

        if (!users.length) break;
        cursor = users[users.length - 1].id;

        // Process each user
        await Promise.allSettled(
          users.map(async (u) => {
            try {
              await generateDailyDigest(u.id);
              await generateReminders(u.id);
              await generateGroups(u.id);
              processed++;
            } catch (err) {
              console.error(`[Digest Job] Failed for user ${u.id}:`, err);
            }
          }),
        );
      }

      console.info(`[Digest Job] Done — ${processed} users processed`);
    } catch (err) {
      console.error('[Digest Job] Fatal error:', err);
    }
  });

  console.info('[Digest Job] Scheduled: daily at 7:00 AM');
}