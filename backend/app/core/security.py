import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.hash import pbkdf2_sha256
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.deps import get_db
from app.models.user import User


bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pbkdf2_sha256.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    if not hashed:
        return False

    if hashed.startswith("$pbkdf2-sha256$"):
        return pbkdf2_sha256.verify(password, hashed)

    if hashed.startswith("$2"):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
        except ValueError:
            return False

    return False


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status_code=401, detail="Vous devez être connecté.")

    token = creds.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        sub: str | None = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Jeton invalide.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Jeton invalide ou expiré.")

    user = db.query(User).filter(User.id == sub).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable.")
    if user.is_suspended:
        raise HTTPException(status_code=403, detail="Votre compte est suspendu.")
    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Action réservée au super admin.",
        )
    return current_user

