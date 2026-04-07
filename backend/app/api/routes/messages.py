from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.modules import is_feature_enabled
from app.core.security import get_current_user
from app.db.deps import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.property import Property
from app.models.user import User
from app.schemas.chat import (
    ConversationDetailPublic,
    ConversationEnsurePayload,
    ConversationPublic,
    MessageCreate,
    MessagePublic,
)

router = APIRouter()


def _guard_chat_enabled(db: Session) -> None:
    if not is_feature_enabled(db, "listing_chat", default=True):
        raise HTTPException(status_code=403, detail="Le chat des annonces est desactive pour le moment.")


def _serialize_conversation(conversation: Conversation, current_user: User) -> ConversationPublic:
    last_message = conversation.messages[-1] if conversation.messages else None
    counterpart = conversation.owner if current_user.id != conversation.owner_id else conversation.tenant
    unread_count = sum(
        1
        for message in conversation.messages
        if message.sender_id != current_user.id and message.read_at is None
    )
    return ConversationPublic(
        id=conversation.id,
        property_id=conversation.property_id,
        owner_id=conversation.owner_id,
        tenant_id=conversation.tenant_id,
        status=conversation.status,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        property_title=conversation.property.title if conversation.property else "Annonce",
        property_city=conversation.property.city if conversation.property else "",
        last_message_preview=last_message.body[:96] if last_message else None,
        unread_count=unread_count,
        counterpart_name=counterpart.full_name if counterpart else None,
        counterpart_role=counterpart.role if counterpart else None,
    )


def _serialize_conversation_detail(conversation: Conversation, current_user: User) -> ConversationDetailPublic:
    summary = _serialize_conversation(conversation, current_user)
    return ConversationDetailPublic(
        **summary.model_dump(),
        messages=[MessagePublic.model_validate(message) for message in conversation.messages],
    )


def _get_accessible_conversation(db: Session, conversation_id: uuid.UUID, current_user: User) -> Conversation:
    conversation = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.property),
            joinedload(Conversation.owner),
            joinedload(Conversation.tenant),
            joinedload(Conversation.messages).joinedload(Message.sender),
        )
        .filter(Conversation.id == conversation_id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation introuvable.")
    if current_user.role != "admin" and current_user.id not in {conversation.owner_id, conversation.tenant_id}:
        raise HTTPException(status_code=403, detail="Acces interdit a cette conversation.")
    return conversation


@router.get("/", response_model=list[ConversationPublic])
def list_my_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _guard_chat_enabled(db)
    query = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.property),
            joinedload(Conversation.owner),
            joinedload(Conversation.tenant),
            joinedload(Conversation.messages).joinedload(Message.sender),
        )
        .order_by(Conversation.updated_at.desc())
    )
    if current_user.role != "admin":
        query = query.filter(
            (Conversation.owner_id == current_user.id) | (Conversation.tenant_id == current_user.id)
        )
    conversations = query.limit(100).all()
    return [_serialize_conversation(item, current_user) for item in conversations]


@router.post("/ensure", response_model=ConversationDetailPublic, status_code=status.HTTP_201_CREATED)
def ensure_conversation_for_property(
    payload: ConversationEnsurePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _guard_chat_enabled(db)
    if current_user.role in {"proprietaire", "admin"}:
        raise HTTPException(status_code=403, detail="Le chat annonce est reserve aux locataires.")

    property_obj = db.query(Property).options(joinedload(Property.owner)).filter(Property.id == payload.property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Annonce introuvable.")
    if not property_obj.owner:
        raise HTTPException(status_code=400, detail="Proprietaire introuvable pour cette annonce.")

    conversation = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.property),
            joinedload(Conversation.owner),
            joinedload(Conversation.tenant),
            joinedload(Conversation.messages).joinedload(Message.sender),
        )
        .filter(
            Conversation.property_id == property_obj.id,
            Conversation.owner_id == property_obj.owner_id,
            Conversation.tenant_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        conversation = Conversation(
            property_id=property_obj.id,
            owner_id=property_obj.owner_id,
            tenant_id=current_user.id,
            status="active",
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        conversation = _get_accessible_conversation(db, conversation.id, current_user)
        return _serialize_conversation_detail(conversation, current_user)

    return _serialize_conversation_detail(conversation, current_user)


@router.get("/{conversation_id}", response_model=ConversationDetailPublic)
def get_conversation_detail(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _guard_chat_enabled(db)
    conversation = _get_accessible_conversation(db, conversation_id, current_user)
    unread_messages = [
        message
        for message in conversation.messages
        if message.sender_id != current_user.id and message.read_at is None
    ]
    if unread_messages:
        now = datetime.utcnow()
        for message in unread_messages:
            message.read_at = now
            db.add(message)
        db.commit()
        conversation = _get_accessible_conversation(db, conversation_id, current_user)
    return _serialize_conversation_detail(conversation, current_user)


@router.post("/{conversation_id}/messages", response_model=MessagePublic, status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _guard_chat_enabled(db)
    conversation = _get_accessible_conversation(db, conversation_id, current_user)
    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        body=payload.body.strip(),
    )
    conversation.updated_at = datetime.utcnow()
    db.add(message)
    db.add(conversation)
    db.commit()
    db.refresh(message)
    return MessagePublic.model_validate(message)
