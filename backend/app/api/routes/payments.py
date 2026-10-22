from __future__ import annotations

import hashlib
import hmac
import json
import time
import uuid
from datetime import datetime
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse, urlunparse, parse_qsl
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, Request as FastAPIRequest, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.core.visit_access import (
    PAID_PAYMENT_STATUSES,
    apply_wave_session,
    has_paid_visit_access,
    is_visit_access_active,
)
from app.db.deps import get_db
from app.models.property import Property
from app.models.user import User
from app.models.visit_access_payment import VisitAccessPayment
from app.schemas.payment import (
    VisitAccessCheckoutCreate,
    VisitAccessCheckoutPublic,
    VisitAccessStatusPublic,
)

router = APIRouter()


def _ensure_tenant(user: User) -> None:
    if user.role in {"proprietaire", "admin"}:
        raise HTTPException(status_code=403, detail="Ce paiement est réservé aux locataires.")


def _append_query_params(url: str, params: dict[str, str]) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query.update(params)
    return urlunparse(parsed._replace(query=urlencode(query)))


def _wave_api_request(method: str, path: str, payload: dict | None = None) -> dict:
    api_key = settings.wave_api_key.strip() if settings.wave_api_key else ""
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Wave Business n'est pas encore configuré côté serveur. Ajoutez WAVE_API_KEY dans l'environnement backend.",
        )

    url = f"{settings.wave_api_base_url.rstrip('/')}{path}"
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(url, data=body, method=method)
    request.add_header("Authorization", f"Bearer {api_key}")
    request.add_header("Content-Type", "application/json")
    request.add_header("Accept", "application/json")

    try:
        with urlopen(request, timeout=20) as response:
            response_body = response.read().decode("utf-8")
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        try:
            payload_details = json.loads(details)
            message = payload_details.get("message") or payload_details.get("detail") or details
        except json.JSONDecodeError:
            message = details or exc.reason
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Wave a refusé la requête: {message}",
        ) from exc
    except URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Impossible de contacter Wave Business pour le moment.",
        ) from exc

    if not response_body:
        return {}
    try:
        return json.loads(response_body)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Réponse Wave invalide.",
        ) from exc


def _latest_visit_access_payment(
    db: Session,
    property_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> VisitAccessPayment | None:
    base_query = db.query(VisitAccessPayment).filter(
        VisitAccessPayment.property_id == property_id,
        VisitAccessPayment.tenant_id == tenant_id,
    )
    # An active ticket wins over a newer pending/failed checkout attempt.
    active = (
        base_query.filter(
            VisitAccessPayment.payment_status.in_(PAID_PAYMENT_STATUSES),
            VisitAccessPayment.expires_at > datetime.utcnow(),
        )
        .order_by(VisitAccessPayment.expires_at.desc())
        .first()
    )
    return active or base_query.order_by(VisitAccessPayment.created_at.desc()).first()


def _serialize_status(
    payment: VisitAccessPayment | None,
    property_id: uuid.UUID,
) -> VisitAccessStatusPublic:
    return VisitAccessStatusPublic(
        has_access=is_visit_access_active(payment),
        payment_id=payment.id if payment else None,
        payment_status=payment.payment_status if payment else None,
        checkout_status=payment.checkout_status if payment else None,
        amount=payment.amount if payment else settings.wave_visit_access_amount,
        currency=payment.currency if payment else settings.wave_checkout_currency,
        paid_at=payment.paid_at if payment else None,
        expires_at=payment.expires_at if payment else None,
    )


def _parse_wave_signature(header: str) -> tuple[str | None, list[str]]:
    timestamp: str | None = None
    signatures: list[str] = []
    for part in header.split(","):
        key, _, value = part.strip().partition("=")
        if key == "t":
            timestamp = value
        elif key == "v1" and value:
            signatures.append(value)
    return timestamp, signatures


def _verify_wave_signature(raw_body: bytes, header: str | None) -> None:
    secret = settings.wave_webhook_secret.strip() if settings.wave_webhook_secret else ""
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook Wave non configuré. Ajoutez WAVE_WEBHOOK_SECRET dans l'environnement backend.",
        )
    if not header:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Signature Wave manquante.")

    timestamp, signatures = _parse_wave_signature(header)
    if not timestamp or not signatures or not timestamp.isdigit():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Signature Wave invalide.")
    if abs(time.time() - int(timestamp)) > settings.wave_webhook_tolerance_seconds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Signature Wave expirée.")

    expected = hmac.new(secret.encode("utf-8"), timestamp.encode("utf-8") + raw_body, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, signature) for signature in signatures):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Signature Wave invalide.")


@router.get("/visit-access/{property_id}", response_model=VisitAccessStatusPublic)
def get_visit_access_status(
    property_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_tenant(current_user)
    payment = _latest_visit_access_payment(db, property_id, current_user.id)
    return _serialize_status(payment, property_id)


@router.post(
    "/visit-access/{property_id}/checkout",
    response_model=VisitAccessCheckoutPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_visit_access_checkout(
    property_id: uuid.UUID,
    payload: VisitAccessCheckoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_tenant(current_user)
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Logement introuvable.")
    if has_paid_visit_access(db, property_id, current_user.id):
        raise HTTPException(status_code=409, detail="Le ticket de visite est déjà payé.")

    payment = VisitAccessPayment(
        property_id=property_obj.id,
        owner_id=property_obj.owner_id,
        tenant_id=current_user.id,
        amount=settings.wave_visit_access_amount,
        currency=settings.wave_checkout_currency,
        client_reference=f"visit-access:{uuid.uuid4()}",
        checkout_status="pending",
        payment_status="pending",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    base_success_url = payload.success_url or f"{settings.frontend_origin.rstrip('/')}/logements/{property_id}"
    base_error_url = payload.error_url or f"{settings.frontend_origin.rstrip('/')}/logements/{property_id}"
    success_url = _append_query_params(
        base_success_url,
        {"wave_status": "success", "visit_payment_id": str(payment.id)},
    )
    error_url = _append_query_params(
        base_error_url,
        {"wave_status": "error", "visit_payment_id": str(payment.id)},
    )

    wave_payload = {
        "amount": str(payment.amount),
        "currency": payment.currency,
        "client_reference": payment.client_reference,
        "success_url": success_url,
        "error_url": error_url,
    }
    wave_session = _wave_api_request("POST", "/v1/checkout/sessions", wave_payload)
    wave_launch_url = wave_session.get("wave_launch_url")
    if not wave_launch_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Wave n'a pas renvoyé l'URL de paiement.",
        )

    payment.wave_checkout_session_id = wave_session.get("id")
    payment.wave_launch_url = wave_launch_url
    payment.checkout_status = wave_session.get("checkout_status") or payment.checkout_status
    payment.payment_status = wave_session.get("payment_status") or payment.payment_status
    payment.updated_at = datetime.utcnow()
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/visit-access/{payment_id}/verify", response_model=VisitAccessStatusPublic)
def verify_visit_access_payment(
    payment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_tenant(current_user)
    payment = (
        db.query(VisitAccessPayment)
        .filter(
            VisitAccessPayment.id == payment_id,
            VisitAccessPayment.tenant_id == current_user.id,
        )
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable.")
    if not payment.wave_checkout_session_id:
        raise HTTPException(status_code=400, detail="Session Wave introuvable pour ce paiement.")

    wave_session = _wave_api_request("GET", f"/v1/checkout/sessions/{payment.wave_checkout_session_id}")
    apply_wave_session(payment, wave_session)
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return _serialize_status(payment, payment.property_id)


@router.post("/wave/webhook", include_in_schema=False)
async def wave_webhook(request: FastAPIRequest, db: Session = Depends(get_db)):
    raw_body = await request.body()
    _verify_wave_signature(raw_body, request.headers.get("Wave-Signature"))

    try:
        event = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Payload Wave invalide.") from exc

    event_type = event.get("type") or ""
    session = event.get("data") or {}
    # Acknowledge events we don't handle so Wave does not keep retrying them.
    if not event_type.startswith("checkout.session.") or not isinstance(session, dict):
        return {"received": True}

    client_reference = session.get("client_reference")
    session_id = session.get("id")
    query = db.query(VisitAccessPayment)
    if client_reference:
        payment = query.filter(VisitAccessPayment.client_reference == client_reference).first()
    elif session_id:
        payment = query.filter(VisitAccessPayment.wave_checkout_session_id == session_id).first()
    else:
        payment = None
    if payment is None:
        return {"received": True}

    if event_type == "checkout.session.payment_failed" and not session.get("payment_status"):
        session = {**session, "payment_status": "failed"}
    # Never downgrade a ticket that is already paid (events can arrive out of order).
    if payment.payment_status in PAID_PAYMENT_STATUSES and session.get("payment_status") not in PAID_PAYMENT_STATUSES:
        return {"received": True}

    apply_wave_session(payment, session)
    db.add(payment)
    db.commit()
    return {"received": True}
