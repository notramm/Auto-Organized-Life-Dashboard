# services/ai-processing/src/main.py

from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio
import structlog

from .config import settings
from .workers.kafka_consumer import start_kafka_consumer, stop_kafka_consumer
from .routes.health import router as health_router

log = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    log.info("Starting AI Processing Service")
    consumer_task = asyncio.create_task(start_kafka_consumer())
    yield
    # Shutdown
    log.info("Shutting down AI Processing Service")
    await stop_kafka_consumer()
    consumer_task.cancel()

app = FastAPI(
    title="AOLD AI Processing Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(health_router)