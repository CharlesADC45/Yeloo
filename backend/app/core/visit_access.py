import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.visit_access_payment import VisitAccessPayment


PAID_PAYMENT_STATUSES = {"succeeded"}


def is_visit_access_active(payment: VisitAccessPayment | None, now: datetime | None = None) -> bool:
    if payment is None or payment.payment_status not in PAID_PAYMENT_STATUSES or payment.expires_at is None:
        return False
    now = now or datetime.utcnow()
    return payment.expires_at.replace(tzinfo=None) > now


def apply_wave_session(payment: VisitAccessPayment, wave_session: dict) -> None:
    """Copy Wave checkout session state onto the payment and open the access window once paid."""
    payment.checkout_status = wave_session.get("checkout_status") or payment.checkout_status
    payment.payment_status = wave_session.get("payment_status") or payment.payment_status
    if wave_session.get("id") and not payment.wave_checkout_session_id:
        payment.wave_checkout_session_id = wave_session["id"]
    now = datetime.utcnow()
    if payment.payment_status in PAID_PAYMENT_STATUSES and payment.paid_at is None:
        payment.paid_at = now
        payment.expires_at = now + timedelta(days=settings.wave_visit_access_days)
    payment.updated_at = now


def has_paid_visit_access(db: Session, property_id: uuid.UUID, tenant_id: uuid.UUID) -> bool:
    return (
        db.query(VisitAccessPayment.id)
        .filter(
            VisitAccessPayment.property_id == property_id,
            VisitAccessPayment.tenant_id == tenant_id,
            VisitAccessPayment.payment_status.in_(PAID_PAYMENT_STATUSES),
            VisitAccessPayment.expires_at > datetime.utcnow(),
        )
        .first()
        is not None
    )


def ensure_paid_visit_access(db: Session, property_id: uuid.UUID, tenant_id: uuid.UUID) -> None:
    if has_paid_visit_access(db, property_id, tenant_id):
        return
    raise HTTPException(
        status_code=402,
        detail=(
            f"Réservez une visite ({settings.wave_visit_access_amount:,} F) pour contacter le propriétaire. "
            "Un ticket expiré doit être renouvelé."
        ).replace(",", " ", 1),
    )
