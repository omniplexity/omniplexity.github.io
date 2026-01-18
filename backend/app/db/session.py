from __future__ import annotations

from typing import Generator

from sqlalchemy.orm import Session, sessionmaker

from backend.app.db.engine import get_engine


def _get_sessionmaker():
    """Get the SessionLocal, creating it if necessary."""
    if not hasattr(_get_sessionmaker, "_cache"):
        _get_sessionmaker._cache = {}

    url = get_engine().url  # Use engine URL as key
    if url not in _get_sessionmaker._cache:
        _get_sessionmaker._cache[url] = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return _get_sessionmaker._cache[url]


def reset_sessionmaker_for_tests():
    """Clear sessionmaker cache (for tests only)."""
    if hasattr(_get_sessionmaker, "_cache"):
        _get_sessionmaker._cache.clear()


# Dependency for FastAPI
def get_db() -> Generator[Session, None, None]:
    """Dependency to get a database session."""
    SessionLocal = _get_sessionmaker()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()