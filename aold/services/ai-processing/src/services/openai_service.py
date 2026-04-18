# services/ai-processing/src/services/openai_service.py

from openai import AsyncOpenAI
from functools import lru_cache
import structlog
from ..config import settings

log = structlog.get_logger()

@lru_cache()
def get_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

async def get_embedding(text: str) -> list[float]:
    """Get embedding vector for text."""
    client = get_client()
    text   = text.strip()[:8000]  # truncate to safe token limit

    response = await client.embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding

async def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Batch embed — cheaper than one-by-one."""
    client  = get_client()
    cleaned = [t.strip()[:8000] for t in texts]

    response = await client.embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=cleaned,
    )
    return [item.embedding for item in response.data]

async def vision_analyze(image_path: str, prompt: str) -> str:
    """Send image to GPT-4o-mini vision."""
    import base64

    client = get_client()
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    ext      = image_path.rsplit(".", 1)[-1].lower()
    mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg",
                "png": "image/png",  "webp": "image/webp"}
    mime     = mime_map.get(ext, "image/jpeg")

    response = await client.chat.completions.create(
        model=settings.OPENAI_VISION_MODEL,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                {"type": "text",      "text": prompt},
            ],
        }],
        max_tokens=500,
    )
    return response.choices[0].message.content or ""

async def chat_complete(system: str, user: str, max_tokens: int = 500) -> str:
    """Simple chat completion."""
    client = get_client()
    response = await client.chat.completions.create(
        model=settings.OPENAI_CHAT_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""