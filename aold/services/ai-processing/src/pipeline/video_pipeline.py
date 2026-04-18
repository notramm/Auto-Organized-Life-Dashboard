# services/ai-processing/src/pipeline/video_pipeline.py

import os
import uuid
import json
import tempfile
import asyncio
import structlog

from ..config import settings
from ..services.openai_service   import get_embedding, chat_complete
from ..services.pinecone_service import upsert_vector
from ..services.s3_service       import upload_file

log = structlog.get_logger()

AGGREGATION_SYSTEM = """Given frame analysis results from a video, return JSON:
{
  "description": "one sentence describing the video content",
  "tags":        ["ai:tag1", "ai:tag2"],
  "scenes":      ["scene1", "scene2"]
}
Tags lowercase, prefixed 'ai:', max 10. Respond ONLY with JSON."""


async def process_video(
    file_id:   str,
    user_id:   str,
    temp_path: str,
    mime_type: str,
) -> dict:
    """
    Full video pipeline:
    1. Extract frames (1 FPS, max 60)
    2. Analyze each frame with vision
    3. Extract audio + transcribe (Whisper)
    4. Aggregate results → description + tags
    5. Generate embedding
    6. Upsert to Pinecone
    7. Extract 15s preview clip
    8. Save to DB
    """
    log.info("Video pipeline started", file_id=file_id)

    result = {
        "tags":             [],
        "pineconeVectorId": None,
        "previewGenerated": False,
    }

    frame_paths = []

    try:
        # ── Step 1: Extract frames ────────────────────────────────
        frame_paths = await _extract_frames(temp_path, file_id)
        log.info("Frames extracted", file_id=file_id, count=len(frame_paths))

        # ── Step 2: Analyze frames (sample every 5th for cost) ────
        sample_frames = frame_paths[::5] or frame_paths[:1]
        frame_results = []
        for fp in sample_frames[:12]:  # max 12 frames analyzed
            analysis = await _analyze_frame(fp)
            frame_results.append(analysis)

        log.info("Frames analyzed", file_id=file_id, analyzed=len(frame_results))

        # ── Step 3: Audio transcription ───────────────────────────
        transcript = await _transcribe_audio(temp_path, file_id)
        log.info("Transcription done", file_id=file_id, chars=len(transcript))

        # ── Step 4: Aggregate all results ─────────────────────────
        aggregated = await _aggregate_results(frame_results, transcript)
        log.info("Results aggregated", file_id=file_id)

        # ── Step 5: Generate embedding ────────────────────────────
        embed_text = _build_embed_text(aggregated, transcript)
        vector     = await get_embedding(embed_text)

        # ── Step 6: Upsert to Pinecone ────────────────────────────
        vector_id = f"vid_{file_id}"
        metadata  = {
            "fileId":    file_id,
            "userId":    user_id,
            "fileType":  "VIDEO",
            "tags":      aggregated.get("tags", []),
            "createdAt": _now(),
        }
        await upsert_vector(vector_id, vector, metadata, namespace=user_id)
        log.info("Vector upserted", file_id=file_id)

        # ── Step 7: Extract 15s preview clip ──────────────────────
        preview_path  = await _extract_preview_clip(temp_path, file_id)
        thumb_path    = await _extract_thumbnail(frame_paths[0] if frame_paths else temp_path, file_id)

        thumb_s3_key   = f"thumbnails/{user_id}/{file_id}/thumb_200.jpg"
        preview_s3_key = f"previews/{user_id}/{file_id}/preview.mp4"

        await upload_file(thumb_path,   thumb_s3_key,   "image/jpeg")
        await upload_file(preview_path, preview_s3_key, "video/mp4")

        # ── Step 8: Save to DB ────────────────────────────────────
        await _save_metadata(
            file_id, aggregated, transcript,
            vector_id, thumb_s3_key, preview_s3_key,
        )

        result["tags"]             = aggregated.get("tags", [])
        result["pineconeVectorId"] = vector_id
        result["previewGenerated"] = True

    except Exception as e:
        log.error("Video pipeline failed", file_id=file_id, error=str(e), exc_info=True)
        raise
    finally:
        _cleanup(temp_path, *frame_paths)

    return result


# ── Helpers ───────────────────────────────────────────────────────

async def _extract_frames(video_path: str, file_id: str) -> list[str]:
    """Extract frames at 1 FPS using FFmpeg."""
    frames_dir = tempfile.mkdtemp(prefix=f"frames_{file_id}_")
    output_pattern = os.path.join(frames_dir, "frame_%04d.jpg")

    cmd = [
        "ffmpeg", "-i", video_path,
        "-vf", f"fps={settings.VIDEO_FRAME_EXTRACTION_FPS},scale=640:-1",
        "-frames:v", str(settings.VIDEO_MAX_FRAMES),
        "-q:v", "3",
        output_pattern,
        "-y", "-loglevel", "error"
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await proc.communicate()

    frames = sorted([
        os.path.join(frames_dir, f)
        for f in os.listdir(frames_dir)
        if f.endswith(".jpg")
    ])
    return frames


async def _analyze_frame(frame_path: str) -> dict:
    """Analyze single frame with vision model."""
    from ..services.openai_service import vision_analyze
    prompt = """Describe this video frame briefly. Return JSON:
{"objects": ["list"], "scene": "scene label", "tags": ["ai:tag1"]}
Respond ONLY with JSON."""
    raw = await vision_analyze(frame_path, prompt)
    try:
        clean = raw.strip().lstrip("```json").rstrip("```").strip()
        return json.loads(clean)
    except Exception:
        return {"objects": [], "scene": "unknown", "tags": []}


async def _transcribe_audio(video_path: str, file_id: str) -> str:
    """Extract audio and transcribe with Whisper."""
    audio_path = os.path.join(tempfile.gettempdir(), f"audio_{file_id}.wav")

    cmd = [
        "ffmpeg", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "16000", "-ac", "1",
        audio_path, "-y", "-loglevel", "error"
    ]

    proc = await asyncio.create_subprocess_exec(*cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await proc.communicate()

    if not os.path.exists(audio_path):
        return ""

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        with open(audio_path, "rb") as audio_file:
            transcript = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="en",
            )
        return transcript.text
    except Exception as e:
        log.warning("Transcription failed", error=str(e))
        return ""
    finally:
        _cleanup(audio_path)


async def _aggregate_results(frame_results: list[dict], transcript: str) -> dict:
    """Aggregate frame analysis into final tags/description."""
    # Collect all tags and scenes across frames
    all_tags   = []
    all_scenes = []
    all_objects = []

    for frame in frame_results:
        all_tags.extend(frame.get("tags", []))
        if frame.get("scene"):
            all_scenes.append(frame["scene"])
        all_objects.extend(frame.get("objects", []))

    # Deduplicate, pick top by frequency
    from collections import Counter
    top_tags   = [t for t, _ in Counter(all_tags).most_common(10)]
    top_scenes = list(set(all_scenes))[:5]

    summary_input = f"""
Frame objects: {', '.join(set(all_objects)[:20])}
Scenes: {', '.join(top_scenes)}
Tags: {', '.join(top_tags)}
Transcript snippet: {transcript[:500] if transcript else 'No audio'}
"""
    return await _json_complete(AGGREGATION_SYSTEM, summary_input)


async def _json_complete(system: str, user: str) -> dict:
    raw = await chat_complete(system, user, max_tokens=400)
    try:
        clean = raw.strip().lstrip("```json").rstrip("```").strip()
        return json.loads(clean)
    except Exception:
        return {"description": "Video content", "tags": ["ai:video"], "scenes": []}


def _build_embed_text(aggregated: dict, transcript: str) -> str:
    parts = []
    if aggregated.get("description"):
        parts.append(aggregated["description"])
    if aggregated.get("scenes"):
        parts.append("Scenes: " + ", ".join(aggregated["scenes"]))
    if aggregated.get("tags"):
        parts.append("Tags: " + ", ".join(t.replace("ai:", "") for t in aggregated["tags"]))
    if transcript:
        parts.append("Transcript: " + transcript[:1000])
    return " | ".join(parts) or "video"


async def _extract_preview_clip(video_path: str, file_id: str) -> str:
    """Extract 15s preview at 360p from most interesting segment (start for now)."""
    preview_path = os.path.join(tempfile.gettempdir(), f"preview_{file_id}.mp4")

    cmd = [
        "ffmpeg", "-i", video_path,
        "-ss", "0", "-t", str(settings.VIDEO_PREVIEW_DURATION_SECONDS if hasattr(settings, 'VIDEO_PREVIEW_DURATION_SECONDS') else 15),
        "-vf", "scale=640:-1",
        "-c:v", "libx264", "-crf", "28",
        "-c:a", "aac", "-b:a", "96k",
        preview_path, "-y", "-loglevel", "error"
    ]

    proc = await asyncio.create_subprocess_exec(*cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await proc.communicate()
    return preview_path


async def _extract_thumbnail(frame_path: str, file_id: str) -> str:
    """Convert first frame to 200x200 thumbnail."""
    from PIL import Image
    thumb_path = os.path.join(tempfile.gettempdir(), f"thumb_{file_id}.jpg")

    def _resize():
        with Image.open(frame_path) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")
            img.thumbnail((200, 200), Image.LANCZOS)
            img.save(thumb_path, "JPEG", quality=85)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _resize)
    return thumb_path


async def _save_metadata(
    file_id:        str,
    aggregated:     dict,
    transcript:     str,
    vector_id:      str,
    thumb_s3_key:   str,
    preview_s3_key: str,
) -> None:
    import asyncpg

    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        await conn.execute("""
            UPDATE file_ai_metadata SET
                description        = $1,
                transcript         = $2,
                detected_scenes    = $3,
                pinecone_vector_id = $4,
                processed_at       = NOW()
            WHERE file_id = $5
        """,
            aggregated.get("description"),
            transcript or None,
            json.dumps([{"label": s, "confidence": 0.85} for s in aggregated.get("scenes", [])]),
            vector_id,
            file_id,
        )

        await conn.execute("""
            INSERT INTO file_previews (file_id, thumbnail_s3_key, preview_s3_key, generated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (file_id) DO UPDATE SET
                thumbnail_s3_key = EXCLUDED.thumbnail_s3_key,
                preview_s3_key   = EXCLUDED.preview_s3_key
        """, file_id, thumb_s3_key, preview_s3_key)

        for tag in aggregated.get("tags", []):
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