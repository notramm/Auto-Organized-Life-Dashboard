// apps/notification-service/src/services/kafka.consumer.ts

import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { PrismaClient } from '@prisma/client';
import { config }       from '../config';
import { KAFKA_TOPICS, KafkaEvent, FileProcessedPayload } from '@aold/shared-types';
import { sendEmail, buildFileProcessedEmail, buildDailyDigestEmail } from './email.service';

const prisma = new PrismaClient();

const kafka = new Kafka({
  clientId: config.KAFKA_CLIENT_ID,
  brokers:  config.KAFKA_BROKERS.split(','),
  retry: { initialRetryTime: 300, retries: 5 },
});

let consumer: Consumer | null = null;

export async function startConsumer(): Promise<void> {
  consumer = kafka.consumer({
    groupId:           'notification-service-group',
    sessionTimeout:    30000,
    heartbeatInterval: 3000,
  });

  await consumer.connect();
  console.info('[Notification:Kafka] Consumer connected');

  await consumer.subscribe({
    topics: [
      KAFKA_TOPICS.FILE_PROCESSED,
      KAFKA_TOPICS.INSIGHTS_TRIGGERS,
    ],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }: EachMessagePayload) => {
      if (!message.value) return;
      try {
        const event = JSON.parse(message.value.toString()) as KafkaEvent<unknown>;
        console.info(`[Notification:Kafka] ${topic} → eventId=${event.eventId}`);

        if (topic === KAFKA_TOPICS.FILE_PROCESSED) {
          await handleFileProcessed(event.payload as FileProcessedPayload);
        }
        if (topic === KAFKA_TOPICS.INSIGHTS_TRIGGERS) {
          await handleInsightTrigger(event.payload as { userId: string; type: string; description: string });
        }
      } catch (err) {
        console.error('[Notification:Kafka] Error:', err);
      }
    },
  });
}

export async function stopConsumer(): Promise<void> {
  if (consumer) { await consumer.disconnect(); consumer = null; }
}

// ── Handle file.processed ─────────────────────────────────────────
async function handleFileProcessed(payload: FileProcessedPayload): Promise<void> {
  if (payload.status !== 'SUCCESS') return;

  const user = await prisma.user.findUnique({
    where:  { id: payload.userId },
    select: { email: true, fullName: true },
  });
  if (!user) return;

  const file = await prisma.file.findUnique({
    where:  { id: payload.fileId },
    select: { name: true, fileType: true },
  });
  if (!file) return;

  const email = buildFileProcessedEmail({
    userName:     user.fullName,
    fileName:     file.name,
    fileType:     file.fileType,
    tags:         payload.tags,
    dashboardUrl: `${config.FRONTEND_URL}/files`,
  });

  await sendEmail({ ...email, to: user.email });
  console.info(`[Notification] File processed email sent → ${user.email}`);
}

// ── Handle insights.triggers ──────────────────────────────────────
async function handleInsightTrigger(payload: {
  userId: string; type: string; description: string;
}): Promise<void> {
  if (payload.type !== 'digest') return;

  const user = await prisma.user.findUnique({
    where:  { id: payload.userId },
    select: { email: true, fullName: true },
  });
  if (!user) return;

  const email = buildDailyDigestEmail({
    userName:     user.fullName,
    description:  payload.description,
    dashboardUrl: `${config.FRONTEND_URL}/insights`,
  });

  await sendEmail({ ...email, to: user.email });
  console.info(`[Notification] Digest email sent → ${user.email}`);
}