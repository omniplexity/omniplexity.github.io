from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.auth.deps import require_active_user
from backend.app.db.models import Conversation, Message, User
from backend.app.db.session import get_db
from backend.app.services.chat_service import list_messages_service

router = APIRouter()


@router.get("/conversations/{conversation_id}/messages")
def list_messages(
    conversation_id: int,
    user: User = Depends(require_active_user),
    db: Session = Depends(get_db),
) -> List[dict]:
    """List messages for a conversation."""
    # Check ownership
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id, Conversation.user_id == user.id
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail={"code": "CONVERSATION_NOT_FOUND", "message": "Conversation not found"})

    messages = list_messages_service(db, user.id, conversation_id)
    return [
        {
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "provider_meta": msg.provider_meta,
            "token_usage": msg.token_usage,
            "created_at": msg.created_at.isoformat(),
        }
        for msg in messages
    ]