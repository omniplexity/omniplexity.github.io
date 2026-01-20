from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.auth.csrf import require_csrf
from backend.app.auth.deps import require_active_user
from backend.app.db.models import Conversation, User
from backend.app.db.session import get_db
from backend.app.services.chat_service import (
    create_conversation_service,
    delete_conversation_service,
    list_conversations_service,
    rename_conversation_service,
)


class CreateConversationRequest(BaseModel):
    title: str | None = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"title": "My First Conversation"},
                {"title": None}  # Will use auto-generated title
            ]
        }
    }


class RenameConversationRequest(BaseModel):
    title: str

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"title": "Updated Conversation Title"}
            ]
        }
    }


router = APIRouter()


@router.post("/conversations", dependencies=[Depends(require_csrf)])
def create_conversation(
    request: CreateConversationRequest,
    user: User = Depends(require_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Create a new conversation."""
    conversation = create_conversation_service(db, user.id, request.title)
    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at.isoformat(),
        "updated_at": conversation.updated_at.isoformat(),
    }


@router.get("/conversations")
def list_conversations(
    q: str | None = None,
    user: User = Depends(require_active_user),
    db: Session = Depends(get_db),
) -> List[dict]:
    """List conversations for the user, optionally filtered by search query."""
    conversations = list_conversations_service(db, user.id, q)
    return [
        {
            "id": conv.id,
            "title": conv.title,
            "created_at": conv.created_at.isoformat(),
            "updated_at": conv.updated_at.isoformat(),
        }
        for conv in conversations
    ]


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: int,
    user: User = Depends(require_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Get a single conversation by ID."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id, Conversation.user_id == user.id
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail={"code": "CONVERSATION_NOT_FOUND", "message": "Conversation not found"})

    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at.isoformat(),
        "updated_at": conversation.updated_at.isoformat(),
    }


@router.patch("/conversations/{conversation_id}", dependencies=[Depends(require_csrf)])
def rename_conversation(
    conversation_id: int,
    request: RenameConversationRequest,
    user: User = Depends(require_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Rename a conversation."""
    # Check ownership
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id, Conversation.user_id == user.id
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail={"code": "CONVERSATION_NOT_FOUND", "message": "Conversation not found"})

    rename_conversation_service(db, user.id, conversation_id, request.title)
    db.commit()
    return {"message": "Conversation renamed"}


@router.delete("/conversations/{conversation_id}", dependencies=[Depends(require_csrf)])
def delete_conversation(
    conversation_id: int,
    user: User = Depends(require_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Delete a conversation and its messages."""
    # Check ownership
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id, Conversation.user_id == user.id
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail={"code": "CONVERSATION_NOT_FOUND", "message": "Conversation not found"})

    delete_conversation_service(db, user.id, conversation_id)
    db.commit()
    return {"message": "Conversation deleted"}