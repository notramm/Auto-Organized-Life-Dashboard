# services/ai-processing/src/pipeline/document_pipeline.py

import os
import uuid
import json
import structlog

from ..config import settings
from ..services.openai_service   import get_embedding, get_embeddings_batch, chat_complete
from ..services.pinecone_service import upsert_vector
from ..services.s3_service       import upload_file

log = structlog.get_logger()

SUMMARY_SYSTEM = """You are a document analyst. Given document text, return a JSON:
{
  "summary":   "3 sentence summary of the document",
  "tags":      ["ai:tag1", "ai:tag2"],
  "entities":  {
    "people":        ["name1"],
    "organizations": ["org1"],
    "dates":         ["2024-01-01"],
    "amounts":       ["$1000"],
    "locations":     ["Mumbai"]
  }
}
Tags must be lowercase prefixed with 'ai:'. Max 10 tags.
Respond ONLY with the JSON object."""


async def process_document(
    file_id:   str,
    user_id:   str,
    temp_path: str,
    mime_type: str,
) -> dict:
    """
    Full document pipeline:
    1. Extract text
    2. Chunk text
    3. Summarize + extract entities
    4. Generate embeddings (per chunk)
    5. Upsert to Pinecone
    6. Generate page-1 thumbnail
    7. Save to DB
    """
    log.info("Document pipeline started", file_id=file_id, mime_type=mime_type)

    result = {
        "tags":             [],
        "pineconeVectorId": None,
        "previewGenerated": False,
    }

    try:
        # ── Step 1: Extract text ──────────────────────────────────
        text = await _extract_text(temp_path, mime_type)
        if not text.strip():
            log.warning("No text extracted", file_id=file_id)
            text = "Document with no extractable text"

        log.info("Text extracted", file_id=file_id, chars=len(text))

        # ── Step 2: Chunk text ────────────────────────────────────
        chunks = _chunk_text(text, chunk_size=1500, overlap=100)
        log.info("Text chunked", file_id=file_id, chunks=len(chunks))

        # ── Step 3: Summarize (first 4000 chars only — cost control)
        summary_data = await _summarize(text[:4000])
        log.info("Summary generated", file_id=file_id)

        # ── Step 4: Embed chunks (batch API) ─────────────────────
        # Use first chunk + summary for primary vector
        primary_text = f"{summary_data.get('summary', '')} | {chunks[0] if chunks else text[:500]}"
        primary_vector = await get_embedding(primary_text)

        # Batch embed all chunks (for passage-level retrieval later)
        chunk_vectors = []
        if len(chunks) > 1:
            chunk_vectors = await get_embeddings_batch(chunks[:20])  # max 20 chunks

        log.info("Embeddings generated", file_id=file_id, chunk_count=len(chunk_vectors))

        # ── Step 5: Upsert primary vector to Pinecone ─────────────
        vector_id = f"doc_{file_id}"
        metadata  = {
            "fileId":    file_id,
            "userId":    user_id,
            "fileType":  "DOCUMENT",
            "tags":      summary_data.get("tags", []),
            "createdAt": _now(),
        }
        await upsert_vector(vector_id, primary_vector, metadata, namespace=user_id)

        # Upsert chunk vectors (for passage-level search)
        for i, (chunk, vec) in enumerate(zip(chunks[1:], chunk_vectors)):
            chunk_vid = f"doc_{file_id}_chunk_{i}"
            chunk_meta = {
                "fileId":     file_id,
                "userId":     user_id,
                "fileType":   "DOCUMENT",
                "chunkIndex": i,
                "chunkText":  chunk[:200],  # store snippet for match reason
                "isChunk":    True,
            }
            await upsert_vector(chunk_vid, vec, chunk_meta, namespace=user_id)

        log.info("Vectors upserted", file_id=file_id)

        # ── Step 6: Generate page-1 thumbnail ─────────────────────
        thumb_path, preview_path = await _generate_preview(temp_path, file_id, mime_type)

        thumb_s3_key   = f"thumbnails/{user_id}/{file_id}/thumb_200.jpg"
        preview_s3_key = f"previews/{user_id}/{file_id}/preview.jpg"

        if thumb_path and os.path.exists(thumb_path):
            await upload_file(thumb_path,   thumb_s3_key,   "image/jpeg")
            await upload_file(preview_path, preview_s3_key, "image/jpeg")
            preview_generated = True
        else:
            thumb_s3_key = preview_s3_key = None
            preview_generated = False

        log.info("Preview uploaded", file_id=file_id)

        # ── Step 7: Save to DB ────────────────────────────────────
        await _save_metadata(
            file_id, text, summary_data,
            vector_id, thumb_s3_key, preview_s3_key,
        )

        result["tags"]             = summary_data.get("tags", [])
        result["pineconeVectorId"] = vector_id
        result["previewGenerated"] = preview_generated

    except Exception as e:
        log.error("Document pipeline failed", file_id=file_id, error=str(e), exc_info=True)
        raise
    finally:
        _cleanup(temp_path)

    return result


# ── Helpers ───────────────────────────────────────────────────────

async def _extract_text(path: str, mime_type: str) -> str:
    import asyncio

    def _extract():
        if mime_type == "application/pdf":
            import pdfplumber
            text = ""
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages[:50]:  # max 50 pages
                    text += (page.extract_text() or "") + "\n"
            return text

        elif "wordprocessingml" in mime_type or mime_type == "application/msword":
            from docx import Document
            doc  = Document(path)
            return "\n".join(p.text for p in doc.paragraphs)

        elif mime_type in ("text/plain", "text/markdown", "text/csv"):
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()

        else:
            return ""

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _extract)


def _chunk_text(text: str, chunk_size: int = 1500, overlap: int = 100) -> list[str]:
    """Simple character-based chunking with overlap."""
    if not text:
        return []

    chunks = []
    start  = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap  # overlap for context continuity

    return [c.strip() for c in chunks if c.strip()]


async def _summarize(text: str) -> dict:
    import json as _json
    raw = await chat_complete(SUMMARY_SYSTEM, text, max_tokens=600)
    try:
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        return _json.loads(clean.strip())
    except Exception:
        return {
            "summary":  "Document uploaded by user.",
            "tags":     ["ai:document"],
            "entities": {"people": [], "organizations": [], "dates": [], "amounts": [], "locations": []},
        }


async def _generate_preview(path: str, file_id: str, mime_type: str):
    """Rasterize page 1 of PDF/DOCX to JPEG."""
    import asyncio
    import tempfile

    thumb_path   = os.path.join(tempfile.gettempdir(), f"thumb_{file_id}.jpg")
    preview_path = os.path.join(tempfile.gettempdir(), f"preview_{file_id}.jpg")

    def _rasterize():
        try:
            if mime_type == "application/pdf":
                # Use pdf2image
                from pdf2image import convert_from_path
                pages = convert_from_path(path, first_page=1, last_page=1, dpi=150)
                if pages:
                    pages[0].save(preview_path, "JPEG", quality=85)
                    # Thumbnail
                    from PIL import Image
                    with Image.open(preview_path) as img:
                        img.thumbnail((200, 200), Image.LANCZOS)
                        img.save(thumb_path, "JPEG", quality=80)
                    return True
            return False
        except Exception as e:
            log.warning("Preview generation failed", error=str(e))
            return False

    loop    = asyncio.get_event_loop()
    success = await loop.run_in_executor(None, _rasterize)

    if success:
        return thumb_path, preview_path
    return None, None


async def _save_metadata(
    file_id:        str,
    full_text:      str,
    summary_data:   dict,
    vector_id:      str,
    thumb_s3_key:   str | None,
    preview_s3_key: str | None,
) -> None:
    import asyncpg

    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        entities = summary_data.get("entities", {})

        await conn.execute("""
            UPDATE file_ai_metadata SET
                summary              = $1,
                detected_entities    = $2,
                pinecone_vector_id   = $3,
                processed_at         = NOW()
            WHERE file_id = $4
        """,
            summary_data.get("summary"),
            json.dumps(entities),
            vector_id,
            file_id,
        )

        if thumb_s3_key:
            await conn.execute("""
                INSERT INTO file_previews (file_id, thumbnail_s3_key, preview_s3_key, generated_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (file_id) DO UPDATE SET
                    thumbnail_s3_key = EXCLUDED.thumbnail_s3_key,
                    preview_s3_key   = EXCLUDED.preview_s3_key
            """, file_id, thumb_s3_key, preview_s3_key)

        tags = summary_data.get("tags", [])
        for tag in tags:
            await conn.execute("""
                INSERT INTO file_tags (id, file_id, tag_value, source, confidence)
                VALUES ($1, $2, $3, 'AI', $4)
                ON CONFLICT (file_id, tag_value) DO NOTHING
            """, str(uuid.uuid4()), file_id, tag, 0.85)

    finally:
        await conn.close()


def _cleanup(*paths) -> None:
    for p in paths:
        if p and os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass


def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()