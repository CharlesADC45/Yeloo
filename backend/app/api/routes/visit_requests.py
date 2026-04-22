from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.modules import is_feature_enabled
from app.core.security import get_current_user
from app.db.deps import get_db
from app.models.property import Property
from app.models.user import User
from app.models.visit_request import VisitRequest
from app.schemas.visit_request import (
    VisitRequestCreate,
    VisitRequestPublic,
    VisitRequestStatusUpdate,
)

router = APIRouter()

ACTIVE_STATUSES = {"pending", "accepted", "rescheduled"}


def _guard_visit_enabled(db: Session) -> None:
    if not is_feature_enabled(db, "visit_requests", default=True):
        raise HTTPException(status_code=403, detail="Les demandes de visite sont desactivees pour le moment.")


def _ensure_tenant(user: User) -> None:
    if user.role in {"proprietaire", "admin"}:
        raise HTTPException(status_code=403, detail="Ce flow est reserve aux locataires.")


def _serialize_visit_request(visit_request: VisitRequest) -> VisitRequestPublic:
    return VisitRequestPublic.model_validate(visit_request)


@router.get("/mine", response_model=list[VisitRequestPublic])
def list_my_visit_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _guard_visit_enabled(db)
    _ensure_tenant(current_user)
    requests = (
        db.query(VisitRequest)
        .filter(VisitRequest.tenant_id == current_user.id)
        .order_by(VisitRequest.created_at.desc())
        .limit(100)
        .all()
    )
    return [_serialize_visit_request(item) for item in requests]


@router.get("/by-property/{property_id}", response_model=VisitRequestPublic)
def get_latest_visit_request_for_property(
    property_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _guard_visit_enabled(db)
    _ensure_tenant(current_user)
    visit_request = (
        db.query(VisitRequest)
        .filter(
            VisitRequest.property_id == property_id,
            VisitRequest.tenant_id == current_user.id,
        )
        .order_by(VisitRequest.created_at.desc())
        .first()
    )
    if not visit_request:
        raise HTTPException(status_code=404, detail="Aucune demande de visite trouvee.")
    return _serialize_visit_request(visit_request)


@router.post(
    "/by-property/{property_id}",
    response_model=VisitRequestPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_visit_request_for_property(
    property_id: uuid.UUID,
    payload: VisitRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _guard_visit_enabled(db)
    _ensure_tenant(current_user)
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Logement introuvable.")
    if not property_obj.owner_id:
        raise HTTPException(status_code=400, detail="Proprietaire introuvable pour cette annonce.")

    existing = (
        db.query(VisitRequest)
        .filter(
            VisitRequest.property_id == property_id,
            VisitRequest.tenant_id == current_user.id,
            VisitRequest.status.in_(ACTIVE_STATUSES),
        )
        .order_by(VisitRequest.created_at.desc())
        .first()
    )
    if existing:
        return _serialize_visit_request(existing)

    visit_request = VisitRequest(
        property_id=property_obj.id,
        owner_id=property_obj.owner_id,
        tenant_id=current_user.id,
        property_title=property_obj.title,
        property_city=property_obj.city,
        property_neighborhood=property_obj.neighborhood,
        tenant_full_name=current_user.full_name or current_user.email,
        tenant_email=current_user.email,
        tenant_phone=current_user.phone,
        preferred_at=payload.preferred_at,
        message=payload.message.strip() if payload.message else None,
        status="pending",
    )
    db.add(visit_request)
    db.commit()
    db.refresh(visit_request)
    return _serialize_visit_request(visit_request)


@router.get("/owner", response_model=list[VisitRequestPublic])
def list_owner_visit_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _guard_visit_enabled(db)
    if current_user.role not in {"proprietaire", "admin"}:
        raise HTTPException(status_code=403, detail="Action reservee aux proprietaires.")
    query = db.query(VisitRequest).order_by(VisitRequest.created_at.desc())
    if current_user.role != "admin":
        query = query.filter(VisitRequest.owner_id == current_user.id)
    requests = query.limit(120).all()
    return [_serialize_visit_request(item) for item in requests]


@router.patch("/{visit_request_id}/status", response_model=VisitRequestPublic)
def update_visit_request_status(
    visit_request_id: uuid.UUID,
    payload: VisitRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _guard_visit_enabled(db)
    visit_request = db.query(VisitRequest).filter(VisitRequest.id == visit_request_id).first()
    if not visit_request:
        raise HTTPException(status_code=404, detail="Demande de visite introuvable.")
    if current_user.role != "admin" and visit_request.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Action interdite.")
    if payload.status == "rescheduled" and not payload.proposed_at:
        raise HTTPException(status_code=400, detail="Ajoutez une nouvelle date pour proposer un autre horaire.")

    visit_request.status = payload.status
    visit_request.proposed_at = payload.proposed_at if payload.status == "rescheduled" else visit_request.proposed_at
    visit_request.owner_message = payload.owner_message.strip() if payload.owner_message else None
    visit_request.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(visit_request)
    return _serialize_visit_request(visit_request)
