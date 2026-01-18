from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.db.models import User


def create_user(
    session: Session,
    username: str,
    password_hash: str,
    role: str = "user",
    status: str = "active",
) -> User:
    """Create a new user."""
    user = User(
        username=username,
        password_hash=password_hash,
        role=role,
        status=status,
    )
    session.add(user)
    session.flush()  # To get the ID
    return user


def get_user_by_username(session: Session, username: str) -> Optional[User]:
    """Get a user by username."""
    return session.query(User).filter(User.username == username).first()


def set_last_login(session: Session, user_id: int, last_login: datetime) -> None:
    """Update the last login time for a user."""
    session.query(User).filter(User.id == user_id).update({"last_login": last_login})


def set_status(session: Session, user_id: int, status: str) -> None:
    """Update the status of a user."""
    session.query(User).filter(User.id == user_id).update({"status": status})