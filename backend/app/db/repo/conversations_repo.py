from __future__ import annotations

from typing import List

from sqlalchemy.orm import Session

from backend.app.db.models import Conversation


def create_conversation(session: Session, user_id: int, title: str) -> Conversation:
    """Create a new conversation."""
    conversation = Conversation(user_id=user_id, title=title)
    session.add(conversation)
    session.flush()
    return conversation


def list_conversations_for_user(session: Session, user_id: int, q: str | None = None) -> List[Conversation]:
    """List all conversations for a user, optionally filtered by title search, ordered by updated_at desc."""
    query = session.query(Conversation).filter(Conversation.user_id == user_id)
    if q:
        query = query.filter(Conversation.title.ilike(f"%{q}%"))
    return query.order_by(Conversation.updated_at.desc()).all()


def rename_conversation(session: Session, conversation_id: int, new_title: str) -> None:
    """Rename a conversation."""
    session.query(Conversation).filter(Conversation.id == conversation_id).update({"title": new_title})


def delete_conversation(session: Session, conversation_id: int) -> None:
    """Delete a conversation."""
    session.query(Conversation).filter(Conversation.id == conversation_id).delete()