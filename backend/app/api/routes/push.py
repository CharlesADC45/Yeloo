from datetime import datetime

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.db.deps import get_db
from app.models.push_subscription import PushSubscription
from app.models.user import User
from app.schemas.push import (
    PushSubscriptionDeletePayload,
    PushSubscriptionPayload,
    PushVapidPublicKey,
)
from app.services.web_push import is_web_push_configured

router = APIRouter()


@router.get("/vapid-public-key", response_model=PushVapidPublicKey)
def get_vapid_public_key():
    return PushVapidPublicKey(
        public_key=settings.vapid_public_key,
        configured=is_web_push_configured(),
    )


@router.post("/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
def upsert_push_subscription(
    payload: PushSubscriptionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    user_agent: str | None = Header(default=None),
):
    subscription = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == payload.endpoint)
        .first()
    )
    if subscription:
        subscription.user_id = current_user.id
        subscription.p256dh = payload.keys.p256dh
        subscription.auth = payload.keys.auth
        subscription.user_agent = payload.user_agent or user_agent
        subscription.is_active = True
        subscription.updated_at = datetime.utcnow()
    else:
        subscription = PushSubscription(
            user_id=current_user.id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
            user_agent=payload.user_agent or user_agent,
        )
    db.add(subscription)
    db.commit()
    return None


@router.post("/subscriptions/delete", status_code=status.HTTP_204_NO_CONTENT)
def delete_push_subscription(
    payload: PushSubscriptionDeletePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subscription = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.endpoint == payload.endpoint,
            PushSubscription.user_id == current_user.id,
        )
        .first()
    )
    if subscription:
        subscription.is_active = False
        subscription.updated_at = datetime.utcnow()
        db.add(subscription)
        db.commit()
    return None
