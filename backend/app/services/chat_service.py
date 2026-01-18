from __future__ import annotations

from typing import List

from sqlalchemy.orm import Session

from backend.app.db.models import Conversation, Message
from backend.app.db.repo.conversations_repo import (
    create_conversation,
    delete_conversation,
    list_conversations_for_user,
    rename_conversation,
)
from backend.app.db.repo.messages_repo import append_message, list_messages_for_conversation


def create_conversation_service(db: Session, user_id: int, title: str | None = None) -> Conversation:
    """Create a new conversation with optional title."""
    if not title:
        title = "New Conversation"
    return create_conversation(db, user_id, title)


def list_conversations_service(db: Session, user_id: int, q: str | None = None) -> List[Conversation]:
    """List conversations for a user, optionally filtered by search query."""
    return list_conversations_for_user(db, user_id, q)


def rename_conversation_service(db: Session, user_id: int, conversation_id: int, title: str) -> None:
    """Rename a conversation if owned by user."""
    # Note: ownership check should be done at API level
    rename_conversation(db, conversation_id, title)


def delete_conversation_service(db: Session, user_id: int, conversation_id: int) -> None:
    """Delete a conversation and its messages if owned by user."""
    # Note: ownership check should be done at API level
    # Delete messages first due to foreign key constraint
    db.query(Message).filter(Message.conversation_id == conversation_id).delete()
    delete_conversation(db, conversation_id)


def list_messages_service(db: Session, user_id: int, conversation_id: int) -> List[Message]:
    """List messages for a conversation if owned by user."""
    # Note: ownership check should be done at API level
    return list_messages_for_conversation(db, conversation_id)


def append_user_message_service(db: Session, user_id: int, conversation_id: int, content: str) -> Message:
    """Append a user message to a conversation."""
    # Note: ownership check should be done at API level
    return append_message(db, conversation_id, "user", content)


def append_assistant_message_service(
    db: Session,
    user_id: int,
    conversation_id: int,
    content: str,
    provider_meta: dict | None = None,
    token_usage: dict | None = None,
) -> Message:
    """Append an assistant message to a conversation."""
    # Note: ownership check should be done at API level
    return append_message(db, conversation_id, "assistant", content, provider_meta, token_usage)