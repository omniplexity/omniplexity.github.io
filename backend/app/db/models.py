from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    func,
    types,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all models."""


class AuditBase(DeclarativeBase):
    """Base class for audit models."""


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default=None)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="user")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now()
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    device_meta: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)


class Invite(Base):
    __tablename__ = "invites"

    code: Mapped[str] = mapped_column(String(255), primary_key=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, default=None)
    used_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, default=None)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now()
    )


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("conversations.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    provider_meta: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True, default=None)  # JSON
    token_usage: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True, default=None)  # JSON
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now()
    )


class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = {"sqlite_autoincrement": True}

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True
    )
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    target: Mapped[str] = mapped_column(String(500), nullable=False)
    actor_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, default=None)
    ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True, default=None)
    proxy_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True, default=None)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now()
    )


class UserQuota(Base):
    __tablename__ = "user_quotas"

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), primary_key=True)
    messages_per_day: Mapped[int] = mapped_column(Integer, nullable=False, default=200)
    tokens_per_day: Mapped[int] = mapped_column(Integer, nullable=False, default=200000)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )


class UserUsageDaily(Base):
    __tablename__ = "user_usage_daily"

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), primary_key=True)
    day: Mapped[str] = mapped_column(String(10), primary_key=True)  # YYYY-MM-DD
    messages_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tokens_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )


# Indexes for performance
Index("idx_users_username", User.username)
Index("idx_sessions_user_id", Session.user_id)
Index("idx_sessions_expires_at", Session.expires_at)
Index("idx_invites_created_by", Invite.created_by)
Index("idx_invites_used_by", Invite.used_by)
Index("idx_conversations_user_id", Conversation.user_id)
Index("idx_messages_conversation_id", Message.conversation_id)
Index("idx_audit_log_actor_user_id", AuditLog.actor_user_id)
Index("idx_audit_log_created_at", AuditLog.created_at)
Index("idx_usage_user_day", UserUsageDaily.user_id, UserUsageDaily.day)