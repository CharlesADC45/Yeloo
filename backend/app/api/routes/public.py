from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.modules import is_feature_enabled
from app.db.deps import get_db
from app.models.public_announcement import PublicAnnouncement
from app.schemas.admin import PublicAnnouncementPublic

router = APIRouter()


def _serialize_public_announcement(item: PublicAnnouncement) -> PublicAnnouncementPublic:
    return PublicAnnouncementPublic(
        id=str(item.id),
        message=item.message,
        icon=item.icon,
        image_url=item.image_url,
        link_url=item.link_url,
        cta_label=item.cta_label,
        target_audience=item.target_audience,
        duration_hours=item.duration_hours,
        is_active=item.is_active,
        starts_at=item.starts_at,
        expires_at=item.expires_at,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("/announcements", response_model=list[PublicAnnouncementPublic])
def list_active_announcements(audience: str = "all", db: Session = Depends(get_db)):
    if not is_feature_enabled(db, "public_announcements"):
        return []

    allowed_audience = audience if audience in {"all", "locataire", "proprietaire"} else "all"
    now = datetime.utcnow()
    items = (
        db.query(PublicAnnouncement)
        .filter(
            PublicAnnouncement.is_active.is_(True),
            PublicAnnouncement.starts_at <= now,
            PublicAnnouncement.expires_at >= now,
            PublicAnnouncement.target_audience.in_(("all", allowed_audience)),
        )
        .order_by(PublicAnnouncement.created_at.desc())
        .limit(10)
        .all()
    )
    return [_serialize_public_announcement(item) for item in items]
