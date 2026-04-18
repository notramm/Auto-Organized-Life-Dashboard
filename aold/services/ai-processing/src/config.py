# services/ai-processing/src/config.py

from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    APP_ENV:   str = "development"
    LOG_LEVEL: str = "info"
    PORT:      int = 8000

    # Kafka
    KAFKA_BROKERS:   str = "localhost:9092"
    KAFKA_CLIENT_ID: str = "ai-processing"
    KAFKA_GROUP_ID:  str = "ai-processing-group"

    # Database
    DATABASE_URL: str

    # AWS S3 / MinIO
    AWS_REGION:            str = "us-east-1"
    AWS_ACCESS_KEY_ID:     str
    AWS_SECRET_ACCESS_KEY: str
    S3_BUCKET_NAME:        str
    S3_ENDPOINT:           str = ""  # MinIO local

    # Pinecone
    PINECONE_API_KEY:    str
    PINECONE_INDEX_NAME: str = "aold-embeddings"

    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_VISION_MODEL:    str = "gpt-4o-mini"
    OPENAI_CHAT_MODEL:      str = "gpt-4o-mini"

    # AI config
    AI_TAG_CONFIDENCE_THRESHOLD: float = 0.65
    VIDEO_FRAME_EXTRACTION_FPS:  int   = 1
    VIDEO_MAX_FRAMES:            int   = 60
    CHUNK_SIZE_TOKENS:           int   = 512
    EMBEDDING_DIMENSIONS:        int   = 1536

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()