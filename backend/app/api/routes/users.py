from pathlib import Path
import shutil
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.storage import get_upload_dir
from app.core.security import get_current_user
from app.db.deps import get_db
from app.models.feature_module import FeatureModule
from app.models.user import User
from app.schemas.admin import FeatureModulePublic
from app.schemas.user import UserPublic, UserUpdate


router = APIRouter()


@router.get("/modules", response_model=list[FeatureModulePublic])
def list_public_modules(db: Session = Depends(get_db)):
    modules = db.query(FeatureModule).order_by(FeatureModule.category.asc(), FeatureModule.name.asc()).all()
    return modules


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserPublic)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.email is not None:
        normalized_email = payload.email.strip().lower()
        if not normalized_email:
            raise HTTPException(status_code=400, detail="Email requis.")
        if normalized_email != current_user.email:
            existing_email = (
                db.query(User)
                .filter(User.email == normalized_email, User.id != current_user.id)
                .first()
            )
            if existing_email:
                raise HTTPException(status_code=400, detail="Cet e-mail est déjà utilisé.")
            current_user.email = normalized_email

    if payload.phone is not None:
        normalized_phone = payload.phone.strip() or None
        if normalized_phone and normalized_phone != current_user.phone:
            existing_phone = (
                db.query(User)
                .filter(User.phone == normalized_phone, User.id != current_user.id)
                .first()
            )
            if existing_phone:
                raise HTTPException(status_code=400, detail="Ce numéro est déjà utilisé.")
        current_user.phone = normalized_phone

    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip() or None

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserPublic)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Format d'image invalide.")

    upload_dir = get_upload_dir() / "avatars"
    upload_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "").suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        extension = ".jpg"

    filename = f"{current_user.id}-{uuid.uuid4().hex}{extension}"
    destination = upload_dir / filename

    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    current_user.profile_image_url = f"/uploads/avatars/{filename}"
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

