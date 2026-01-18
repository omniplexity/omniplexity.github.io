from __future__ import annotations

import secrets
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.config.settings import settings
from backend.app.db.models import Session as DBSession, User


def create_session(
    db: Session,
    user_id: int,
    device_meta: Optional[str] = None,
    ttl_seconds: Optional[int] = None,
) -> tuple[str, str]:
    """Create a new session and return (session_id, csrf_token)."""
    if ttl_seconds is None:
        ttl_seconds = settings.session_ttl_seconds
    expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)

    session_id = secrets.token_urlsafe(32)  # 256-bit entropy

    db_session = DBSession(
        id=session_id,
        user_id=user_id,
        expires_at=expires_at,
        device_meta=device_meta,
    )
    db.add(db_session)
    db.flush()  # Get ID if needed, but we use session_id as primary key

    # Derive csrf_token via HMAC(secret, session_id)
    import hmac
    import hashlib

    csrf_token = hmac.new(
        settings.csrf_secret.encode(),
        session_id.encode(),
        hashlib.sha256
    ).hexdigest()

    return session_id, csrf_token


def get_session(db: Session, session_id: str) -> Optional[DBSession]:
    """Get a session by ID, checking expiry."""
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if session and session.expires_at > datetime.utcnow():
        return session
    return None


def delete_session(db: Session, session_id: str) -> bool:
    """Delete a session."""
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if session:
        db.delete(session)
        return True
    return False


def get_csrf_token(session_id: str) -> str:
    """Derive CSRF token from session_id."""
    import hmac
    import hashlib
    return hmac.new(
        settings.csrf_secret.encode(),
        session_id.encode(),
        hashlib.sha256
    ).hexdigest()