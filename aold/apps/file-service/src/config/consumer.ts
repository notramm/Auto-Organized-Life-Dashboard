// apps/file-service/src/config/consumer.ts

import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { PrismaClient, FileStatus } from '@prisma/client';
import { config } from './index';
import { KAFKA_TOPICS, KafkaEvent, FileProcessedPayload } from '@aold/shared-types';

const prisma = new PrismaClient();

const kafka = new Kafka({
  clientId: `${config.KAFKA_CLIENT_ID}-consumer`,
  brokers:  config.KAFKA_BROKERS.split(','),
  retry: { initialRetryTime: 300, retries: 5 },
});

let consumer: Consumer | null = null;

export async function startConsumer(): Promise<void> {
  consumer = kafka.consumer({
    groupId:          'file-service-group',
    sessionTimeout:   30000,
    heartbeatInterval: 3000,
  });

  await consumer.connect();
  console.info('[Kafka Consumer] Connected');

  await consumer.subscribe({
    topics: [KAFKA_TOPICS.FILE_PROCESSED],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      const { topic, message } = payload;
      if (!message.value) return;

      try {
        const event = JSON.parse(message.value.toString()) as KafkaEvent<FileProcessedPayload>;
        console.info(`[Kafka Consumer] Received: ${topic} → fileId=${event.payload.fileId}`);

        if (topic === KAFKA_TOPICS.FILE_PROCESSED) {
          await handleFileProcessed(event.payload);
        }
      } catch (err) {
        console.error('[Kafka Consumer] Error processing message:', err);
        // Don't throw — let Kafka move on (DLQ handles persistent failures)
      }
    },
  });
}

export async function stopConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
    console.info('[Kafka Consumer] Disconnected');
  }
}

// ── Handler: file.processed ───────────────────────────────────────
// AI service sends this after processing is complete
async function handleFileProcessed(payload: FileProcessedPayload): Promise<void> {
  const { fileId, status, tags, pineconeVectorId, previewGenerated } = payload;

  // Update file status
  await prisma.file.update({
    where: { id: fileId },
    data:  {
      status: status === 'SUCCESS' ? FileStatus.READY : FileStatus.ERROR,
    },
  });

  // Update AI metadata with vector ID
  if (pineconeVectorId) {
    await prisma.fileAIMetadata.update({
      where: { fileId },
      data:  {
        pineconeVectorId,
        processedAt:           new Date(),
        processingDurationMs:  payload.processingDurationMs,
      },
    });
  }

  // Store AI tags
  if (tags.length > 0) {
    await prisma.fileTag.createMany({
      data: tags.map((tag) => ({
        id:         crypto.randomUUID(),
        fileId,
        tagValue:   tag,
        source:     'AI' as const,
        confidence: 0.85, // default — AI service can include per-tag confidence later
      })),
      skipDuplicates: true,
    });
  }

  console.info(`[File Service] File ${fileId} marked ${status === 'SUCCESS' ? 'READY' : 'ERROR'}`);
}