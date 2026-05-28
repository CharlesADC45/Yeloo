from __future__ import annotations

import shutil
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.core.modules import is_feature_enabled
from app.core.security import get_current_user
from app.core.storage import get_upload_dir
from app.core.storage_minio import build_object_key, is_minio_configured, upload_file
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
from app.services.web_push import send_web_push_to_user

router = APIRouter()


def _guard_chat_enabled(db: Session) -> None:
    if not is_feature_enabled(db, "listing_chat", default=True):
        raise HTTPException(status_code=403, detail="Le chat des annonces est desactive pour le moment.")


def _last_message_preview(message: Message | None) -> str | None:
    if not message:
        return None
    content = (message.body or "").strip()
    if content:
        return content[:96]
    if message.attachment_name:
        return f"Piece jointe ? {message.attachment_name}"
    if message.attachment_url:
        return "Piece jointe"
    return None


def _serialize_conversation(conversation: Conversation, current_user: User) -> ConversationPublic:
    last_message = conversation.messages[-1] if conversation.messages else None
    counterpart = conversation.owner if current_user.id != conversation.owner_id else conversation.tenant
    unread_count = sum(
        1
        for message in conversation.messages
        if message.sender_id != current_user.id and message.read_at is None
    )
    property_image = None
    if conversation.property and conversation.property.photo_urls:
        property_image = conversation.property.photo_urls[0]
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
        property_image_url=property_image,
        last_message_preview=_last_message_preview(last_message),
        unread_count=unread_count,
        counterpart_name=counterpart.full_name if counterpart else None,
        counterpart_role=counterpart.role if counterpart else None,
        counterpart_phone=counterpart.phone if counterpart else None,
        counterpart_email=counterpart.email if counterpart else None,
        counterpart_avatar_url=counterpart.profile_image_url if counterpart else None,
    )


def _serialize_conversation_detail(conversation: Conversation, current_user: User) -> ConversationDetailPublic:
    summary = _serialize_conversation(conversation, current_user)
    return ConversationDetailPublic(
        **summary.model_dump(),
        messages=[MessagePublic.model_validate(message) for message in conversation.messages],
    )


def _conversation_query(db: Session):
    return db.query(Conversation).options(
        joinedload(Conversation.property).joinedload(Property.photos),
        joinedload(Conversation.owner),
        joinedload(Conversation.tenant),
        joinedload(Conversation.messages).joinedload(Message.sender),
    )


def _get_accessible_conversation(db: Session, conversation_id: uuid.UUID, current_user: User) -> Conversation:
    conversation = _conversation_query(db).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation introuvable.")
    if current_user.id not in {conversation.owner_id, conversation.tenant_id}:
        raise HTTPException(status_code=403, detail="Acces interdit a cette conversation.")
    return conversation


def _notify_message_recipient(db: Session, conversation: Conversation, message: Message, sender: User) -> None:
    recipient = conversation.tenant if sender.id == conversation.owner_id else conversation.owner
    if not recipient:
        return

    preview = _last_message_preview(message) or "Nouveau message"
    url = f"/messages/{conversation.id}"
    if recipient.role == "proprietaire":
        url = f"{url}?mode=owner"

    send_web_push_to_user(
        db,
        recipient.id,
        title=sender.full_name or "Nouveau message Yeloo",
        body=preview,
        url=url,
        tag=f"message:{conversation.id}",
    )


def _store_attachment(upload: UploadFile, conversation_id: uuid.UUID) -> tuple[str, str | None]:
    content_type = upload.content_type or "application/octet-stream"
    if not (
        content_type.startswith("image/")
        or content_type.startswith("video/")
        or content_type.startswith("audio/")
        or content_type == "application/pdf"
    ):
        raise HTTPException(status_code=400, detail="Type de fichier non pris en charge.")

    original_name = upload.filename or "piece-jointe"
    if is_minio_configured():
        object_key = build_object_key(f"messages/{conversation_id}/attachments", original_name)
        try:
            return upload_file(upload.file, object_key, content_type), content_type
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Upload de la piece jointe impossible.") from exc

    target_dir = get_upload_dir() / "messages" / str(conversation_id)
    target_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(original_name).suffix or ".bin"
    filename = f"{uuid.uuid4().hex}{suffix}"
    destination = target_dir / filename
    with destination.open("wb") as buffer:
        shutil.copyfileobj(upload.file, buffer)
    return f"/uploads/messages/{conversation_id}/{filename}", content_type


@router.get("/", response_model=list[ConversationPublic])
def list_my_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _guard_chat_enabled(db)
    query = _conversation_query(db).order_by(Conversation.updated_at.desc())
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

    conversation = _conversation_query(db).filter(
        Conversation.property_id == property_obj.id,
        Conversation.owner_id == property_obj.owner_id,
        Conversation.tenant_id == current_user.id,
    ).first()
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
    _notify_message_recipient(db, conversation, message, current_user)
    return MessagePublic.model_validate(message)


@router.post("/{conversation_id}/attachments", response_model=MessagePublic, status_code=status.HTTP_201_CREATED)
def send_attachment(
    conversation_id: uuid.UUID,
    file: UploadFile = File(...),
    body: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _guard_chat_enabled(db)
    conversation = _get_accessible_conversation(db, conversation_id, current_user)
    attachment_url, attachment_type = _store_attachment(file, conversation.id)
    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        body=(body or "").strip(),
        attachment_url=attachment_url,
        attachment_name=file.filename or "piece-jointe",
        attachment_type=attachment_type,
    )
    conversation.updated_at = datetime.utcnow()
    db.add(message)
    db.add(conversation)
    db.commit()
    db.refresh(message)
    _notify_message_recipient(db, conversation, message, current_user)
    return MessagePublic.model_validate(message)
