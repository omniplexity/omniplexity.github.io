"""Core security helpers facade."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import uuid

import jwt
from jwt import InvalidTokenError, ExpiredSignatureError

from backend.app.config.settings import settings
from backend.app.auth.password import hash_password, verify_password
from backend.app.security.cors import cors_kwargs


def create_access_token(user_id: int, role: str) -> tuple[str, int]:
    """Create a JWT access token and return (token, expires_in)."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=settings.jwt_access_ttl_seconds)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": str(uuid.uuid4()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return token, settings.jwt_access_ttl_seconds


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except ExpiredSignatureError as exc:
        raise ValueError("TOKEN_EXPIRED") from exc
    except InvalidTokenError as exc:
        raise ValueError("TOKEN_INVALID") from exc


__all__ = [
    "cors_kwargs",
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_access_token",
]
