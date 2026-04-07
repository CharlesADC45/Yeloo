from sqlalchemy.orm import Session

from app.models.feature_module import FeatureModule


def is_feature_enabled(db: Session, key: str, default: bool = True) -> bool:
    module = db.query(FeatureModule).filter(FeatureModule.key == key).first()
    if not module:
        return default
    return bool(module.is_enabled)
