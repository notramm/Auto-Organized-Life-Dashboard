# services/ai-processing/src/services/kafka_producer.py

import json
import uuid
from datetime import datetime, timezone
from confluent_kafka import Producer
import structlog

from ..config import settings

log = structlog.get_logger()

_producer: Producer | None = None

def get_producer() -> Producer:
    global _producer
    if _producer is None:
        _producer = Producer({
            "bootstrap.servers": settings.KAFKA_BROKERS,
            "client.id":         f"{settings.KAFKA_CLIENT_ID}-producer",
            "acks":              "all",
            "retries":           3,
        })
    return _producer

def _publish(topic: str, key: str, payload: dict) -> None:
    producer = get_producer()
    event = {
        "eventId":   str(uuid.uuid4()),
        "eventType": topic,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload":   payload,
    }
    producer.produce(
        topic,
        key=key.encode("utf-8"),
        value=json.dumps(event).encode("utf-8"),
    )
    producer.flush()
    log.info("Published event", topic=topic, key=key)

async def publish_file_processed(payload: dict) -> None:
    _publish("file.processed", payload["fileId"], payload)

async def publish_file_failed(payload: dict) -> None:
    _publish("file.processing-failed", payload["fileId"], payload)