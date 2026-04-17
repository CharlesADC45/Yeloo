import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.deps import get_db
from app.models.lease_request import LeaseRequest
from app.models.property import Property
from app.models.user import User
from app.schemas.lease_request import LeaseRequestPublic, LeaseRequestStatusUpdate

router = APIRouter()


def _format_price(value: float, period: str) -> str:
    return f"{float(value):,.0f} FCFA / {period}".replace(",", " ")


def _build_contract_text(property_obj: Property, tenant: User, owner: User) -> str:
    location = ", ".join(
        part
        for part in [property_obj.neighborhood, property_obj.city, property_obj.address]
        if part
    )
    return "\n".join(
        [
            "CONTRAT DE BAIL - VERSION DEMANDE",
            "",
            f"Bien: {property_obj.title}",
            f"Type: {property_obj.property_type}",
            f"Localisation: {location or property_obj.city}",
            f"Loyer: {_format_price(property_obj.price, property_obj.price_period)}",
            "",
            f"Proprietaire: {owner.full_name or owner.email}",
            f"Contact proprietaire: {owner.email}{f' / {owner.phone}' if owner.phone else ''}",
            "",
            f"Locataire: {tenant.full_name or tenant.email}",
            f"Contact locataire: {tenant.email}{f' / {tenant.phone}' if tenant.phone else ''}",
            "",
            "Clauses principales:",
            "1. Le locataire confirme son interet pour le bien et demande la validation du proprietaire.",
            "2. Le montant affiche sert de base de discussion pour la conclusion du bail.",
            "3. Le proprietaire reste libre de valider ou refuser la demande apres verification.",
            "4. Toute occupation du logement reste soumise a la validation finale du proprietaire.",
            "5. La signature finale se fait physiquement sur document papier.",
        ]
    )


def _serialize_lease_request(lease_request: LeaseRequest) -> LeaseRequestPublic:
    return LeaseRequestPublic.model_validate(lease_request)


def _ensure_tenant(user: User) -> None:
    if user.role in ("proprietaire", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce flow est reserve aux locataires.",
        )


@router.get("/by-property/{property_id}", response_model=LeaseRequestPublic)
def get_or_fail_latest_request_for_property(
    property_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_tenant(current_user)
    lease_request = (
        db.query(LeaseRequest)
        .filter(
            LeaseRequest.property_id == property_id,
            LeaseRequest.tenant_id == current_user.id,
        )
        .order_by(LeaseRequest.created_at.desc())
        .first()
    )
    if not lease_request:
        raise HTTPException(status_code=404, detail="Aucune demande de bail trouvee.")
    return _serialize_lease_request(lease_request)


@router.post(
    "/by-property/{property_id}",
    response_model=LeaseRequestPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_or_get_lease_request_for_property(
    property_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_tenant(current_user)
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Logement introuvable.")

    owner = db.query(User).filter(User.id == property_obj.owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Proprietaire introuvable.")

    existing = (
        db.query(LeaseRequest)
        .filter(
            LeaseRequest.property_id == property_id,
            LeaseRequest.tenant_id == current_user.id,
        )
        .order_by(LeaseRequest.created_at.desc())
        .first()
    )
    if existing:
        return _serialize_lease_request(existing)

    lease_request = LeaseRequest(
        property_id=property_obj.id,
        owner_id=owner.id,
        tenant_id=current_user.id,
        property_title=property_obj.title,
        property_city=property_obj.city,
        property_neighborhood=property_obj.neighborhood,
        property_address=property_obj.address,
        property_price=property_obj.price,
        property_price_period=property_obj.price_period,
        property_type=property_obj.property_type,
        tenant_full_name=current_user.full_name or current_user.email,
        tenant_email=current_user.email,
        tenant_phone=current_user.phone,
        contract_text=_build_contract_text(property_obj, current_user, owner),
        status="draft",
    )
    db.add(lease_request)
    db.commit()
    db.refresh(lease_request)
    return _serialize_lease_request(lease_request)


@router.get("/owner", response_model=list[LeaseRequestPublic])
def list_owner_lease_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("proprietaire", "admin"):
        raise HTTPException(status_code=403, detail="Action reservee aux proprietaires.")
    requests = (
        db.query(LeaseRequest)
        .filter(LeaseRequest.owner_id == current_user.id)
        .order_by(LeaseRequest.created_at.desc())
        .all()
    )
    return [_serialize_lease_request(item) for item in requests]


@router.get("/{lease_request_id}", response_model=LeaseRequestPublic)
def get_lease_request(
    lease_request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lease_request = db.query(LeaseRequest).filter(LeaseRequest.id == lease_request_id).first()
    if not lease_request:
        raise HTTPException(status_code=404, detail="Demande de bail introuvable.")
    if current_user.role != "admin" and current_user.id not in {
        lease_request.owner_id,
        lease_request.tenant_id,
    }:
        raise HTTPException(status_code=403, detail="Action interdite.")
    return _serialize_lease_request(lease_request)


@router.patch("/{lease_request_id}/status", response_model=LeaseRequestPublic)
def update_lease_request_status(
    lease_request_id: uuid.UUID,
    payload: LeaseRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lease_request = db.query(LeaseRequest).filter(LeaseRequest.id == lease_request_id).first()
    if not lease_request:
        raise HTTPException(status_code=404, detail="Demande de bail introuvable.")
    if current_user.role != "admin" and lease_request.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Action interdite.")

    lease_request.status = payload.status
    lease_request.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(lease_request)
    return _serialize_lease_request(lease_request)


@router.post("/{lease_request_id}/owner-sign", response_model=LeaseRequestPublic)
def owner_sign_lease_request(
    lease_request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raise HTTPException(
        status_code=410,
        detail="La signature numerique est retiree. Le bail doit etre signe physiquement.",
    )
    lease_request = db.query(LeaseRequest).filter(LeaseRequest.id == lease_request_id).first()
    if not lease_request:
        raise HTTPException(status_code=404, detail="Demande de bail introuvable.")
    if current_user.role != "admin" and lease_request.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Action interdite.")
    if not lease_request.tenant_signature_data or lease_request.status == "draft":
        raise HTTPException(
            status_code=400,
            detail="Le locataire doit signer le bail avant la validation propriétaire.",
        )
    if lease_request.status == "rejected":
        raise HTTPException(
            status_code=400,
            detail="Cette demande a déjà été refusée et ne peut plus être signée.",
        )

    lease_request.owner_signature_data = payload.owner_signature_data
    lease_request.owner_signed_at = datetime.utcnow()
    lease_request.reviewed_at = datetime.utcnow()
    lease_request.status = "approved"
    db.commit()
    db.refresh(lease_request)
    return _serialize_lease_request(lease_request)
