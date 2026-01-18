from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine

from backend.app.config.settings import settings


def get_engine() -> Engine:
    """Get the SQLAlchemy engine, creating it if necessary."""
    if not hasattr(get_engine, "_cache"):
        get_engine._cache = {}

    url = settings.database_url
    if url not in get_engine._cache:
        # Ensure directory exists for SQLite files
        if url.startswith("sqlite:///"):
            db_path_str = url[len("sqlite:///"):]
            db_path = Path(db_path_str)
            db_path.parent.mkdir(parents=True, exist_ok=True)

        engine = create_engine(url, echo=False, pool_pre_ping=True)

        def _set_sqlite_pragma(dbapi_connection, connection_record):
            """Set SQLite pragmas on each connection."""
            if url.startswith("sqlite"):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.close()

        # Apply pragmas on every connection for SQLite
        event.listens_for(engine, "connect")(_set_sqlite_pragma)

        get_engine._cache[url] = engine

    return get_engine._cache[url]


def reset_engine_for_tests():
    """Dispose and clear engine cache (for tests only)."""
    if hasattr(get_engine, "_cache"):
        for engine in get_engine._cache.values():
            engine.dispose()
        get_engine._cache.clear()


# For backward compatibility, expose engine as the result of get_engine()
engine = get_engine()