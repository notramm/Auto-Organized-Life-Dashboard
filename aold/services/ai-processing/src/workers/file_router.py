# services/ai-processing/src/workers/file_router.py
# Routes each uploaded file to the correct pipeline based on file type

import asyncio
import time
import structlog

from ..services.s3_service       import download_file_to_temp
from ..services.kafka_producer   import publish_file_processed, publish_file_failed
from ..pipeline.image_pipeline   import process_image
from ..pipeline.video_pipeline   import process_video
from ..pipeline.document_pipeline import process_document

log = structlog.get_logger()

IMAGE_MIMES    = {"image/jpeg","image/png","image/webp","image/gif","image/heic","image/bmp"}
VIDEO_MIMES    = {"video/mp4","video/quicktime","video/x-msvideo","video/webm"}
DOCUMENT_MIMES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain","text/markdown","text/csv",
}

async def route_file(payload: dict) -> None:
    file_id   = payload["fileId"]
    user_id   = payload["userId"]
    s3_key    = payload["s3Key"]
    s3_bucket = payload["s3Bucket"]
    mime_type = payload["mimeType"]

    log.info("Routing file", file_id=file_id, mime_type=mime_type)
    start = time.time()

    try:
        # Download from S3 to temp file
        temp_path = await download_file_to_temp(s3_key, s3_bucket)

        # Route to correct pipeline
        if mime_type in IMAGE_MIMES:
            result = await process_image(file_id, user_id, temp_path, mime_type)
        elif mime_type in VIDEO_MIMES:
            result = await process_video(file_id, user_id, temp_path, mime_type)
        elif mime_type in DOCUMENT_MIMES:
            result = await process_document(file_id, user_id, temp_path, mime_type)
        else:
            log.warning("Unsupported mime type", mime_type=mime_type)
            result = {"tags": [], "pineconeVectorId": None, "previewGenerated": False}

        duration_ms = int((time.time() - start) * 1000)

        await publish_file_processed({
            "fileId":               file_id,
            "userId":               user_id,
            "status":               "SUCCESS",
            "tags":                 result["tags"],
            "pineconeVectorId":     result.get("pineconeVectorId"),
            "previewGenerated":     result.get("previewGenerated", False),
            "processingDurationMs": duration_ms,
            "processedAt":          _now(),
        })

        log.info("File processed", file_id=file_id, duration_ms=duration_ms)

    except Exception as e:
        log.error("File processing failed", file_id=file_id, error=str(e), exc_info=True)
        await publish_file_failed({
            "fileId":  file_id,
            "userId":  user_id,
            "error":   str(e),
            "status":  "FAILED",
        })

def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()