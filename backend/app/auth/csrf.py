from __future__ import annotations

import hmac
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.auth.sessions import get_csrf_token, get_session
from backend.app.config.settings import settings
from backend.app.db.session import get_db


def require_csrf(request: Request, db: Session = Depends(get_db)) -> None:
    """Validate X-CSRF-Token matches derived token for current session cookie."""
    if settings.auth_mode == "bearer":
        return
    session_id = request.cookies.get(settings.session_cookie_name)
    if not session_id:
        raise HTTPException(
            status_code=401,
            detail={"code": "AUTH_REQUIRED", "message": "Authentication required"},
        )

    if not get_session(db, session_id):
        raise HTTPException(
            status_code=401,
            detail={"code": "SESSION_EXPIRED", "message": "Session expired"},
        )

    provided = request.headers.get("X-CSRF-Token") or ""
    expected = get_csrf_token(session_id)

    if not hmac.compare_digest(provided, expected):
        raise HTTPException(
            status_code=403,
            detail={"code": "CSRF_INVALID", "message": "Invalid CSRF token"},
        )
