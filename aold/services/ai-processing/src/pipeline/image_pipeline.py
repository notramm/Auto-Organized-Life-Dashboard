# services/ai-processing/src/pipeline/image_pipeline.py

import os
import uuid
import tempfile
import structlog
from PIL import Image

from ..config import settings
from ..services.openai_service   import vision_analyze, get_embedding, chat_complete
from ..services.pinecone_service import upsert_vector
from ..services.s3_service       import upload_file

log = structlog.get_logger()

# ── Prompt templates ──────────────────────────────────────────────
VISION_PROMPT = """Analyze this image and return a JSON object with:
{
  "objects":     ["list", "of", "detected", "objects"],
  "scenes":      ["list", "of", "scene", "labels"],
  "ocr_text":    "any text visible in the image or empty string",
  "description": "one sentence description of the image",
  "tags":        ["ai:tag1", "ai:tag2"]
}
All tags must be lowercase, prefixed with 'ai:'. Max 10 tags.
Respond with ONLY the JSON object, no other text."""


async def process_image(
    file_id:   str,
    user_id:   str,
    temp_path: str,
    mime_type: str,
) -> dict:
    """
    Full image pipeline:
    1. Generate thumbnail
    2. Vision analysis (objects, scenes, OCR, description)
    3. Generate embedding
    4. Upsert to Pinecone
    5. Upload thumbnail + preview to S3
    6. Save metadata to DB
    Returns: { tags, pineconeVectorId, previewGenerated }
    """
    log.info("Image pipeline started", file_id=file_id)

    result = {
        "tags":             [],
        "pineconeVectorId": None,
        "previewGenerated": False,
    }

    try:
        # ── Step 1: Generate thumbnail (200x200) ──────────────────
        thumbnail_path = await _generate_thumbnail(temp_path, file_id)
        log.info("Thumbnail generated", file_id=file_id)

        # ── Step 2: Vision analysis ───────────────────────────────
        analysis = await _analyze_image(temp_path)
        log.info("Vision analysis done", file_id=file_id, tags=analysis.get("tags"))

        # ── Step 3: Generate embedding ────────────────────────────
        embed_text = _build_embed_text(analysis)
        vector     = await get_embedding(embed_text)
        log.info("Embedding generated", file_id=file_id, dims=len(vector))

        # ── Step 4: Upsert to Pinecone ────────────────────────────
        vector_id = f"img_{file_id}"
        metadata  = {
            "fileId":    file_id,
            "userId":    user_id,
            "fileType":  "IMAGE",
            "tags":      analysis.get("tags", []),
            "createdAt": _now(),
        }
        await upsert_vector(vector_id, vector, metadata, namespace=user_id)
        log.info("Vector upserted", file_id=file_id, vector_id=vector_id)

        # ── Step 5: Upload thumbnail to S3 ────────────────────────
        thumb_s3_key   = f"thumbnails/{user_id}/{file_id}/thumb_200.jpg"
        preview_s3_key = f"previews/{user_id}/{file_id}/preview.jpg"

        await upload_file(thumbnail_path, thumb_s3_key,   "image/jpeg")
        await upload_file(temp_path,      preview_s3_key, mime_type)
        log.info("Preview uploaded to S3", file_id=file_id)

        # ── Step 6: Save AI metadata to DB ────────────────────────
        await _save_metadata(file_id, analysis, vector_id, thumb_s3_key, preview_s3_key)

        # ── Build result ──────────────────────────────────────────
        result["tags"]             = analysis.get("tags", [])
        result["pineconeVectorId"] = vector_id
        result["previewGenerated"] = True

    except Exception as e:
        log.error("Image pipeline failed", file_id=file_id, error=str(e), exc_info=True)
        raise
    finally:
        # Always clean up temp files
        _cleanup(temp_path, thumbnail_path if 'thumbnail_path' in locals() else None)

    return result


# ── Helpers ───────────────────────────────────────────────────────

async def _generate_thumbnail(image_path: str, file_id: str) -> str:
    """Resize image to 200x200 thumbnail. Returns temp path."""
    import asyncio

    thumb_path = os.path.join(tempfile.gettempdir(), f"thumb_{file_id}.jpg")

    def _resize():
        with Image.open(image_path) as img:
            # Convert to RGB (handles PNG with alpha, HEIC etc.)
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            # Crop to square then resize (preserve aspect ratio)
            img.thumbnail((200, 200), Image.LANCZOS)
            img.save(thumb_path, "JPEG", quality=85, optimize=True)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _resize)
    return thumb_path


async def _analyze_image(image_path: str) -> dict:
    """Run vision model on image. Parse JSON response."""
    import json

    raw = await vision_analyze(image_path, VISION_PROMPT)

    try:
        # Strip markdown code fences if model adds them
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        return json.loads(clean.strip())
    except json.JSONDecodeError:
        log.warning("Vision response not valid JSON, using fallback", raw=raw[:200])
        return {
            "objects":     [],
            "scenes":      [],
            "ocr_text":    "",
            "description": "Image uploaded by user",
            "tags":        ["ai:image"],
        }


def _build_embed_text(analysis: dict) -> str:
    """Build text to embed from analysis result."""
    parts = []

    if analysis.get("description"):
        parts.append(analysis["description"])

    if analysis.get("objects"):
        parts.append("Objects: " + ", ".join(analysis["objects"]))

    if analysis.get("scenes"):
        parts.append("Scenes: " + ", ".join(analysis["scenes"]))

    if analysis.get("ocr_text"):
        parts.append("Text in image: " + analysis["ocr_text"][:500])

    if analysis.get("tags"):
        clean_tags = [t.replace("ai:", "") for t in analysis["tags"]]
        parts.append("Tags: " + ", ".join(clean_tags))

    return " | ".join(parts) or "image"


async def _save_metadata(
    file_id:        str,
    analysis:       dict,
    vector_id:      str,
    thumb_s3_key:   str,
    preview_s3_key: str,
) -> None:
    """Save analysis results to PostgreSQL."""
    import asyncpg
    import json

    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        # Update file_ai_metadata
        await conn.execute("""
            UPDATE file_ai_metadata SET
                description          = $1,
                ocr_text             = $2,
                detected_objects     = $3,
                detected_scenes      = $4,
                pinecone_vector_id   = $5,
                processed_at         = NOW()
            WHERE file_id = $6
        """,
            analysis.get("description"),
            analysis.get("ocr_text") or None,
            json.dumps([{"label": o, "confidence": 0.9} for o in analysis.get("objects", [])]),
            json.dumps([{"label": s, "confidence": 0.9} for s in analysis.get("scenes", [])]),
            vector_id,
            file_id,
        )

        # Upsert file_previews
        await conn.execute("""
            INSERT INTO file_previews (file_id, thumbnail_s3_key, preview_s3_key, generated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (file_id) DO UPDATE SET
                thumbnail_s3_key = EXCLUDED.thumbnail_s3_key,
                preview_s3_key   = EXCLUDED.preview_s3_key,
                generated_at     = NOW()
        """, file_id, thumb_s3_key, preview_s3_key)

        # Insert AI tags
        tags = analysis.get("tags", [])
        if tags:
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