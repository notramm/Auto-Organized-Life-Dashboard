# services/ai-processing/src/workers/kafka_consumer.py

import json
import asyncio
from confluent_kafka import Consumer, KafkaError, KafkaException
import structlog

from ..config import settings
from .file_router import route_file

log = structlog.get_logger()

_consumer: Consumer | None = None
_running  = False

TOPICS = [
    "file.uploaded",
    "file.deleted",
]

async def start_kafka_consumer() -> None:
    global _consumer, _running

    _consumer = Consumer({
        "bootstrap.servers":  settings.KAFKA_BROKERS,
        "group.id":           settings.KAFKA_GROUP_ID,
        "client.id":          settings.KAFKA_CLIENT_ID,
        "auto.offset.reset":  "latest",
        "enable.auto.commit": True,
        # Retry config
        "session.timeout.ms":   30000,
        "heartbeat.interval.ms": 3000,
        "max.poll.interval.ms": 120000,  # 2 min — AI processing can be slow
    })

    _consumer.subscribe(TOPICS)
    _running = True

    log.info("Kafka consumer started", topics=TOPICS)

    # Run poll loop in thread (confluent-kafka is sync)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _poll_loop)

def _poll_loop() -> None:
    global _running

    while _running:
        msg = _consumer.poll(timeout=1.0)

        if msg is None:
            continue

        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                continue
            log.error("Kafka error", error=msg.error())
            continue

        try:
            _handle_message(msg.topic(), msg.value())
        except Exception as e:
            log.error("Failed to handle message",
                      topic=msg.topic(),
                      error=str(e),
                      exc_info=True)
            # Continue — don't crash consumer on single bad message

async def stop_kafka_consumer() -> None:
    global _running
    _running = False
    if _consumer:
        _consumer.close()
    log.info("Kafka consumer stopped")

def _handle_message(topic: str, raw: bytes) -> None:
    if not raw:
        return

    event = json.loads(raw.decode("utf-8"))
    payload = event.get("payload", {})

    log.info("Received event", topic=topic, event_id=event.get("eventId"))

    if topic == "file.uploaded":
        # Run async pipeline in new event loop (we're in a thread)
        asyncio.run(route_file(payload))
    elif topic == "file.deleted":
        asyncio.run(_handle_file_deleted(payload))

async def _handle_file_deleted(payload: dict) -> None:
    from ..services.pinecone_service import delete_vector
    vector_id = payload.get("pineconeVectorId")
    if vector_id:
        await delete_vector(vector_id)
        log.info("Vector deleted", vector_id=vector_id)