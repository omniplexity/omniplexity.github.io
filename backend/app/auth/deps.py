from __future__ import annotations

from fastapi import Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session

from backend.app.auth.sessions import get_session
from backend.app.core.security import decode_access_token
from backend.app.config.settings import settings
from backend.app.db.models import User
from backend.app.db.session import get_db


def _get_user_from_session(request: Request, db: Session) -> User:
    session_id = request.cookies.get(settings.session_cookie_name)
    if not session_id:
        raise HTTPException(status_code=401, detail={"code": "AUTH_REQUIRED", "message": "Authentication required"})

    session = get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=401, detail={"code": "SESSION_EXPIRED", "message": "Session expired"})

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user or user.status != "active":
        raise HTTPException(status_code=401, detail={"code": "USER_INACTIVE", "message": "User account is inactive"})

    return user


def _get_bearer_token(authorization: str | None) -> str | None:
    if not authorization or not isinstance(authorization, str):
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        token = parts[1].strip()
        return token or None
    return None


def _get_user_from_bearer_token(token: str, db: Session) -> User:
    if not token:
        raise HTTPException(status_code=401, detail={"code": "AUTH_REQUIRED", "message": "Authentication required"})

    try:
        payload = decode_access_token(token)
    except ValueError as exc:
        code = "AUTH_INVALID"
        if str(exc) == "TOKEN_EXPIRED":
            code = "AUTH_EXPIRED"
        raise HTTPException(status_code=401, detail={"code": code, "message": "Invalid or expired token"}) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail={"code": "AUTH_INVALID", "message": "Invalid token payload"})

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or user.status != "active":
        raise HTTPException(status_code=401, detail={"code": "USER_INACTIVE", "message": "User account is inactive"})

    return user


def get_current_user(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    """Get current user from bearer token or session cookie based on auth mode."""
    mode = settings.auth_mode
    token = _get_bearer_token(authorization)

    if mode in ("auto", "bearer") and token:
        return _get_user_from_bearer_token(token, db)

    if mode == "bearer":
        raise HTTPException(status_code=401, detail={"code": "AUTH_REQUIRED", "message": "Authentication required"})

    if mode in ("auto", "session"):
        return _get_user_from_session(request, db)

    raise HTTPException(status_code=401, detail={"code": "AUTH_REQUIRED", "message": "Authentication required"})


def require_active_user(user: User = Depends(get_current_user)) -> User:
    """Require an active user."""
    return user


def require_admin(user: User = Depends(require_active_user)) -> User:
    """Require an admin user."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail={"code": "ADMIN_REQUIRED", "message": "Admin access required"})
    return user
