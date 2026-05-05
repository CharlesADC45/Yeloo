import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Form, HTTPException, status
from jose import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.phone import find_user_by_phone, normalize_phone
from app.core.security import get_current_user, hash_password, verify_password
from app.db.deps import get_db
from app.models.feature_module import FeatureModule
from app.models.user import User
from app.schemas.auth import ChangePasswordPayload, Token
from app.schemas.user import UserCreate, UserPublic


router = APIRouter()


def _create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _get_login_guard_config(db: Session) -> tuple[bool, int]:
    module = db.query(FeatureModule).filter(FeatureModule.key == "login_guard").first()
    if not module:
        return True, 3
    return bool(module.is_enabled), int(module.config_value or 3)


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    normalized_email = _normalize_email(payload.email)
    normalized_phone = normalize_phone(payload.phone)

    if not normalized_phone:
        raise HTTPException(status_code=400, detail="Le numéro de téléphone est obligatoire.")

    existing_email = db.query(User).filter(User.email == normalized_email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Cet e-mail est déjà utilisé.")

    existing_phone = find_user_by_phone(db, normalized_phone)
    if existing_phone:
        raise HTTPException(status_code=400, detail="Ce numéro est déjà utilisé.")

    user = User(
        id=uuid.uuid4(),
        email=normalized_email,
        phone=normalized_phone,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(phone: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    normalized_phone = normalize_phone(phone)
    if not normalized_phone:
        raise HTTPException(status_code=400, detail="Le numéro de téléphone est requis.")

    guard_enabled, max_attempts = _get_login_guard_config(db)
    user = find_user_by_phone(db, normalized_phone)
    if not user:
        raise HTTPException(status_code=401, detail="Numéro ou mot de passe invalide.")

    if user.is_suspended:
        raise HTTPException(status_code=403, detail="Votre compte est suspendu.")

    if guard_enabled and user.is_login_locked:
        raise HTTPException(
            status_code=403,
            detail="Compte bloqué après plusieurs tentatives. Contactez l'administrateur.",
        )

    if not verify_password(password, user.hashed_password):
        if guard_enabled:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= max(1, max_attempts):
                user.is_login_locked = True
            db.add(user)
            db.commit()
        raise HTTPException(status_code=401, detail="Numéro ou mot de passe invalide.")

    if user.failed_login_attempts or user.is_login_locked or user.phone != normalized_phone:
        user.failed_login_attempts = 0
        user.is_login_locked = False
        if user.phone != normalized_phone:
            duplicate_phone = find_user_by_phone(db, normalized_phone, exclude_user_id=user.id)
            if not duplicate_phone:
                user.phone = normalized_phone
        db.add(user)
        db.commit()

    token = _create_access_token(str(user.id))
    return {"access_token": token, "token_type": "bearer"}


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect.")
    if len(payload.new_password.strip()) < 8:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 8 caractères.")

    current_user.hashed_password = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()
    return None
