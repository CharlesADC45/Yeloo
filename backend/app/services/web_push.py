from __future__ import annotations

import json
import logging
import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.push_subscription import PushSubscription

try:
    from pywebpush import WebPushException, webpush
except Exception:  # pragma: no cover - optional dependency guard
    WebPushException = Exception
    webpush = None


logger = logging.getLogger(__name__)


def is_web_push_configured() -> bool:
    return bool(settings.vapid_public_key and settings.vapid_private_key and webpush)


def send_web_push_to_user(
    db: Session,
    user_id: uuid.UUID,
    *,
    title: str,
    body: str,
    url: str = "/",
    tag: str | None = None,
) -> None:
    if not is_web_push_configured():
        return

    subscriptions = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == user_id, PushSubscription.is_active.is_(True))
        .all()
    )
    if not subscriptions:
        return

    payload = json.dumps(
        {
            "title": title,
            "body": body,
            "url": url,
            "tag": tag,
            "icon": "/icons/icon-192.png",
            "badge": "/icons/icon-192.png",
        }
    )

    changed = False
    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {
                        "p256dh": subscription.p256dh,
                        "auth": subscription.auth,
                    },
                },
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_subject},
            )
        except WebPushException as exc:
            status_code = getattr(getattr(exc, "response", None), "status_code", None)
            if status_code in {404, 410}:
                subscription.is_active = False
                db.add(subscription)
                changed = True
            else:
                logger.warning("Web push send failed for subscription %s: %s", subscription.id, exc)
        except Exception as exc:  # pragma: no cover - safety net for provider errors
            logger.warning("Web push send failed for subscription %s: %s", subscription.id, exc)

    if changed:
        db.commit()
