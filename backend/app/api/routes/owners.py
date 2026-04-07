from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.modules import is_feature_enabled
from app.core.security import get_current_user
from app.db.deps import get_db
from app.models.owner_profile import OwnerProfile
from app.models.user import User
from app.schemas.owner_profile import OwnerProfilePublic


router = APIRouter()


def _require_value(value: str, label: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail=f"{label} requis.")
    return cleaned


@router.get("/me", response_model=OwnerProfilePublic)
def get_owner_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = (
        db.query(OwnerProfile).filter(OwnerProfile.user_id == current_user.id).first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profil proprietaire introuvable.")
    return profile


@router.post("/onboarding", response_model=OwnerProfilePublic, status_code=status.HTTP_201_CREATED)
def upsert_owner_onboarding(
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    city: str = Form(...),
    address: str = Form(...),
    bank_name: str = Form(...),
    account_number: str = Form(...),
    mobile_money: str = Form(...),
    account_holder: str = Form(...),
    identity_selfie: UploadFile | None = File(None),
    identity_doc: UploadFile | None = File(None),
    property_doc: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_feature_enabled(db, "owner_kyc", default=True):
        raise HTTPException(
            status_code=403,
            detail="La verification proprietaire est temporairement desactivee par l'administration.",
        )
    normalized_email = email.strip().lower()
    if not normalized_email:
        raise HTTPException(status_code=400, detail="Email requis.")
    if normalized_email != current_user.email:
        email_exists = (
            db.query(User)
            .filter(User.email == normalized_email, User.id != current_user.id)
            .first()
        )
        if email_exists:
            raise HTTPException(status_code=400, detail="Cet e-mail est deja utilise.")
        current_user.email = normalized_email

    normalized_phone = _require_value(phone, "Telephone")
    if normalized_phone != (current_user.phone or ""):
        phone_exists = (
            db.query(User)
            .filter(User.phone == normalized_phone, User.id != current_user.id)
            .first()
        )
        if phone_exists:
            raise HTTPException(status_code=400, detail="Ce numero est deja utilise.")
        current_user.phone = normalized_phone

    current_user.full_name = _require_value(full_name, "Nom complet")
    if current_user.role != "proprietaire":
        current_user.role = "proprietaire"

    profile = (
        db.query(OwnerProfile).filter(OwnerProfile.user_id == current_user.id).first()
    )
    if profile is None:
        if identity_doc is None or property_doc is None or identity_selfie is None:
            raise HTTPException(
                status_code=400,
                detail="Piece d'identite, selfie et justificatif de propriete sont requis.",
            )
        profile = OwnerProfile(
            user_id=current_user.id,
            city=_require_value(city, "Ville"),
            main_address=_require_value(address, "Adresse"),
            bank_name=_require_value(bank_name, "Banque"),
            account_number=_require_value(account_number, "Numero de compte"),
            mobile_money=_require_value(mobile_money, "Mobile money"),
            account_holder=_require_value(account_holder, "Nom du titulaire"),
        )
        db.add(profile)
    else:
        profile.city = _require_value(city, "Ville")
        profile.main_address = _require_value(address, "Adresse")
        profile.bank_name = _require_value(bank_name, "Banque")
        profile.account_number = _require_value(account_number, "Numero de compte")
        profile.mobile_money = _require_value(mobile_money, "Mobile money")
        profile.account_holder = _require_value(account_holder, "Nom du titulaire")

    if identity_doc is not None:
        profile.identity_doc_name = identity_doc.filename
    if identity_selfie is not None:
        profile.identity_selfie_name = identity_selfie.filename
    if property_doc is not None:
        profile.property_proof_name = property_doc.filename
    if not profile.identity_doc_name or not profile.identity_selfie_name or not profile.property_proof_name:
        raise HTTPException(
            status_code=400,
            detail="Piece d'identite, selfie et justificatif de propriete sont requis.",
        )

    profile.verification_status = "pending_review"
    profile.verification_notes = None
    profile.reviewed_by = None
    profile.reviewed_at = None
    current_user.is_verified = False

    db.commit()
    db.refresh(profile)
    return profile
