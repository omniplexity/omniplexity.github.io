from __future__ import annotations

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.auth.sessions import get_session
from backend.app.config.settings import settings
from backend.app.db.models import User
from backend.app.db.session import get_db


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Get current user from session cookie."""
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


def require_active_user(user: User = Depends(get_current_user)) -> User:
    """Require an active user."""
    return user


def require_admin(user: User = Depends(require_active_user)) -> User:
    """Require an admin user."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail={"code": "ADMIN_REQUIRED", "message": "Admin access required"})
    return user