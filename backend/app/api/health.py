import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.db.session import get_db
from backend.app.config.settings import settings

router = APIRouter()


@router.get("/health")
def health():
    """Constant-time health check without DB verification."""
    return {"status": "healthy"}


@router.get("/health/deep")
def health_deep(db: Session = Depends(get_db)):
    """Deep health check with DB connectivity verification."""
    # Protected by origin lock middleware
    start_time = time.time()
    try:
        # Simple DB query to verify connectivity
        result = db.execute(text("SELECT 1")).scalar()
        latency_ms = (time.time() - start_time) * 1000
        return {
            "status": "healthy",
            "db": {
                "ok": True,
                "dialect": db.bind.dialect.name,
                "latency_ms": round(latency_ms, 2)
            }
        }
    except Exception:
        raise HTTPException(
            status_code=503,
            detail={"code":"DEEP_HEALTH_FAILED","message":"Deep health check failed"}
        )

@router.get("/version")
async def version():
    return {"version": "0.1.0"}