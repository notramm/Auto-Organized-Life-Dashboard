// apps/search-service/src/config/kafka.ts
import { Kafka, Producer, Partitioners } from 'kafkajs';
import { config } from './index';
import { KAFKA_TOPICS } from '@aold/shared-types';

const kafka = new Kafka({
  clientId: config.KAFKA_CLIENT_ID,
  brokers:  config.KAFKA_BROKERS.split(','),
});

let producer: Producer | null = null;

export async function getProducer(): Promise<Producer> {
  if (producer) return producer;
  producer = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
  await producer.connect();
  return producer;
}

export async function publishSearchPerformed(payload: {
  userId: string; query: string; resultCount: number; latencyMs: number; fileType?: string;
}): Promise<void> {
  const p = await getProducer();
  await p.send({
    topic: KAFKA_TOPICS.SEARCH_PERFORMED,
    messages: [{
      key:   payload.userId,
      value: JSON.stringify({
        eventId:   crypto.randomUUID(),
        eventType: KAFKA_TOPICS.SEARCH_PERFORMED,
        timestamp: new Date().toISOString(),
        payload,
      }),
    }],
  });
}

export async function disconnectProducer(): Promise<void> {
  if (producer) { await producer.disconnect(); producer = null; }
}