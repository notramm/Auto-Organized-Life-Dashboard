# services/ai-processing/src/services/pinecone_service.py

from pinecone import Pinecone
from functools import lru_cache
import structlog
from ..config import settings

log = structlog.get_logger()

@lru_cache()
def get_index():
    pc    = Pinecone(api_key=settings.PINECONE_API_KEY)
    index = pc.Index(settings.PINECONE_INDEX_NAME)
    log.info("Pinecone index connected", index=settings.PINECONE_INDEX_NAME)
    return index

async def upsert_vector(
    vector_id: str,
    vector:    list[float],
    metadata:  dict,
    namespace: str,
) -> str:
    """Upsert one vector. namespace = userId for isolation."""
    import asyncio
    index = get_index()
    loop  = asyncio.get_event_loop()

    await loop.run_in_executor(
        None,
        lambda: index.upsert(
            vectors=[{"id": vector_id, "values": vector, "metadata": metadata}],
            namespace=namespace,
        )
    )
    log.info("Vector upserted", vector_id=vector_id, namespace=namespace)
    return vector_id

async def delete_vector(vector_id: str, namespace: str = "") -> None:
    import asyncio
    index = get_index()
    loop  = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: index.delete(ids=[vector_id], namespace=namespace)
    )
    log.info("Vector deleted", vector_id=vector_id)