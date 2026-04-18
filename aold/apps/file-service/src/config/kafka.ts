// apps/file-service/src/config/kafka.ts

import { Kafka, Producer, Partitioners } from 'kafkajs';
import { config } from './index';
import { KAFKA_TOPICS, KafkaEvent, FileUploadedPayload, FileDeletedPayload } from '@aold/shared-types';
import { generateId } from '@aold/shared-utils';

const kafka = new Kafka({
  clientId: config.KAFKA_CLIENT_ID,
  brokers:  config.KAFKA_BROKERS.split(','),
  retry: { initialRetryTime: 300, retries: 5 },
});

let producer: Producer | null = null;

export async function getProducer(): Promise<Producer> {
  if (producer) return producer;
  producer = kafka.producer({
    createPartitioner:      Partitioners.LegacyPartitioner,
    allowAutoTopicCreation: false,
  });
  await producer.connect();
  console.info('[Kafka] Producer connected');
  return producer;
}

export async function disconnectProducer(): Promise<void> {
  if (producer) { await producer.disconnect(); producer = null; }
}

async function publish<T>(topic: string, key: string, payload: T): Promise<void> {
  const p = await getProducer();
  const event: KafkaEvent<T> = {
    eventId:   generateId(),
    eventType: topic,
    timestamp: new Date().toISOString(),
    payload,
  };
  await p.send({
    topic,
    messages: [{ key, value: JSON.stringify(event) }],
  });
}

export async function publishFileUploaded(payload: FileUploadedPayload): Promise<void> {
  await publish(KAFKA_TOPICS.FILE_UPLOADED, payload.userId, payload);
  console.info(`[Kafka] file.uploaded → fileId=${payload.fileId}`);
}

export async function publishFileDeleted(payload: FileDeletedPayload): Promise<void> {
  await publish(KAFKA_TOPICS.FILE_DELETED, payload.userId, payload);
  console.info(`[Kafka] file.deleted → fileId=${payload.fileId}`);
}