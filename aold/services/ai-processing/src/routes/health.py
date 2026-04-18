# services/ai-processing/src/routes/health.py

from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter()

@router.get("/health")
async def health():
    return {
        "status":  "ok",
        "service": "ai-processing",
        "ts":      datetime.now(timezone.utc).isoformat(),
    }

@router.get("/healthz")
async def liveness():
    return {"status": "ok"}