import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Form, HTTPException, status
from jose import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.db.deps import get_db
from app.models.user import User
from app.schemas.auth import Token
from app.schemas.user import UserCreate, UserPublic


router = APIRouter()


def _create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet e-mail est déjà utilisé.")

    user = User(
        id=uuid.uuid4(),
        email=payload.email.lower(),
        phone=payload.phone,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Identifiants invalides.")
    if user.is_suspended:
        raise HTTPException(status_code=403, detail="Votre compte est suspendu.")

    token = _create_access_token(str(user.id))
    return {"access_token": token, "token_type": "bearer"}

