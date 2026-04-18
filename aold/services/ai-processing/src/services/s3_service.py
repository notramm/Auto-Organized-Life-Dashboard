# services/ai-processing/src/services/s3_service.py

import boto3
import tempfile
import os
import structlog
from ..config import settings

log = structlog.get_logger()

def _get_client():
    kwargs = {
        "region_name":            settings.AWS_REGION,
        "aws_access_key_id":      settings.AWS_ACCESS_KEY_ID,
        "aws_secret_access_key":  settings.AWS_SECRET_ACCESS_KEY,
    }
    if settings.S3_ENDPOINT:
        kwargs["endpoint_url"]    = settings.S3_ENDPOINT
    return boto3.client("s3", **kwargs)

async def download_file_to_temp(s3_key: str, bucket: str) -> str:
    """Download S3 file to a temp path. Returns path."""
    import asyncio

    ext      = os.path.splitext(s3_key)[-1] or ".tmp"
    tmp_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    tmp_path = tmp_file.name
    tmp_file.close()

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: _get_client().download_file(bucket, s3_key, tmp_path)
    )

    log.info("Downloaded from S3", s3_key=s3_key, tmp_path=tmp_path)
    return tmp_path

async def upload_file(local_path: str, s3_key: str, content_type: str = "image/jpeg") -> str:
    """Upload file to S3. Returns S3 key."""
    import asyncio

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: _get_client().upload_file(
            local_path,
            settings.S3_BUCKET_NAME,
            s3_key,
            ExtraArgs={"ContentType": content_type},
        )
    )
    log.info("Uploaded to S3", s3_key=s3_key)
    return s3_key