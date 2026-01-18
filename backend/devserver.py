#!/usr/bin/env python3
"""
Development server launcher that works from any working directory.
"""
import sys
from pathlib import Path

# Add repo root to sys.path if not already present
repo_root = Path(__file__).resolve().parents[1]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from backend.app.config.settings import settings

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower(),
    )