from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.owner_profile import OwnerProfile
from app.models.property import Property
from app.models.user import User


def _clear_demo_data(db: Session) -> tuple[int, int, int]:
    properties_deleted = db.query(Property).delete(synchronize_session=False)
    owner_profiles_deleted = db.query(OwnerProfile).delete(synchronize_session=False)
    demo_owner = db.query(User).filter(User.email == "owner@immoci.local").first()
    demo_owner_deleted = 0
    if demo_owner:
        db.delete(demo_owner)
        demo_owner_deleted = 1
    return properties_deleted, owner_profiles_deleted, demo_owner_deleted


def run() -> None:
    db = SessionLocal()
    try:
        properties_deleted, owner_profiles_deleted, demo_owner_deleted = _clear_demo_data(
            db
        )
        db.commit()
        print(
            "Demo cleanup complete: "
            f"{properties_deleted} properties, "
            f"{owner_profiles_deleted} owner profiles, "
            f"{demo_owner_deleted} demo user removed."
        )
    finally:
        db.close()


if __name__ == "__main__":
    run()
