from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.app.db.models import Message


def append_message(
    session: Session,
    conversation_id: int,
    role: str,
    content: str,
    provider_meta: Optional[Dict[str, Any]] = None,
    token_usage: Optional[Dict[str, Any]] = None,
) -> Message:
    """Append a new message to a conversation."""
    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        provider_meta=provider_meta,
        token_usage=token_usage,
    )
    session.add(message)
    session.flush()
    return message


def list_messages_for_conversation(session: Session, conversation_id: int) -> List[Message]:
    """List all messages for a conversation, ordered by created_at asc."""
    return (
        session.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )