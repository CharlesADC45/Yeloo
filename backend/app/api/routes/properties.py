import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.modules import is_feature_enabled
from app.core.security import get_current_user
from app.core.storage import get_upload_dir
from app.core.storage_minio import build_object_key, is_minio_configured, upload_file
from app.db.deps import get_db
from app.models.property import Property
from app.models.property_photo import PropertyPhoto
from app.models.user import User
from app.schemas.property import PropertyCreate, PropertyPublic, PropertyUpdate

router = APIRouter()


def _serialize_property(prop: Property, include_promo: bool = True) -> PropertyPublic:
    payload = PropertyPublic.model_validate(prop)
    if not include_promo:
        payload.promo_label = None
        payload.promo_until = None
    return payload


@router.get("/", response_model=list[PropertyPublic])
def list_properties(db: Session = Depends(get_db)):
    include_promo = is_feature_enabled(db, "listing_promos")
    properties = db.query(Property).order_by(Property.created_at.desc()).limit(50).all()
    return [_serialize_property(prop, include_promo=include_promo) for prop in properties]


@router.get("/mine", response_model=list[PropertyPublic])
def list_my_properties(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Property)
        .filter(Property.owner_id == current_user.id)
        .order_by(Property.created_at.desc())
        .all()
    )


@router.get("/{property_id}", response_model=PropertyPublic)
def get_property(property_id: uuid.UUID, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Logement introuvable.")
    return _serialize_property(prop, include_promo=is_feature_enabled(db, "listing_promos"))


@router.post("/", response_model=PropertyPublic, status_code=status.HTTP_201_CREATED)
def create_property(
    payload: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("proprietaire", "admin"):
        raise HTTPException(status_code=403, detail="Action reservee aux proprietaires.")
    if not current_user.is_verified and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Votre compte proprietaire est en cours de validation. Publication indisponible pour le moment.",
        )

    prop = Property(
        id=uuid.uuid4(),
        owner_id=current_user.id,
        title=payload.title,
        description=payload.description,
        property_type=payload.property_type,
        price=payload.price,
        price_period=payload.price_period,
        deposit_months=payload.deposit_months,
        advance_months=payload.advance_months,
        surface_m2=payload.surface_m2,
        rooms=payload.rooms,
        bathrooms=payload.bathrooms,
        address=payload.address,
        city=payload.city,
        neighborhood=payload.neighborhood,
        latitude=payload.latitude,
        longitude=payload.longitude,
        video_url=payload.video_url,
        tour_360_url=payload.tour_360_url,
        is_furnished=payload.is_furnished,
        status="draft",
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


@router.put("/{property_id}", response_model=PropertyPublic)
def update_property(
    property_id: uuid.UUID,
    payload: PropertyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Logement introuvable.")
    if current_user.role != "admin" and prop.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Action interdite.")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(prop, field, value)

    db.commit()
    db.refresh(prop)
    return prop


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    property_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Logement introuvable.")
    if current_user.role != "admin" and prop.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Action interdite.")

    upload_root = get_upload_dir()
    property_dir = upload_root / "properties" / str(property_id)
    if property_dir.exists():
        shutil.rmtree(property_dir, ignore_errors=True)

    db.delete(prop)
    db.commit()
    return None


@router.post("/{property_id}/photos", response_model=PropertyPublic)
def upload_property_photos(
    property_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Logement introuvable.")
    if current_user.role != "admin" and prop.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Action interdite.")

    upload_root = get_upload_dir()
    target_dir = upload_root / "properties" / str(property_id)
    use_object_storage = is_minio_configured()
    if not use_object_storage:
        target_dir.mkdir(parents=True, exist_ok=True)

    existing_primary = db.query(PropertyPhoto).filter(PropertyPhoto.property_id == prop.id).first()
    for upload in files:
        if use_object_storage:
            object_key = build_object_key(
                f"properties/{property_id}/photos",
                upload.filename or "photo.jpg",
            )
            try:
                url = upload_file(upload.file, object_key, upload.content_type)
            except Exception as exc:
                raise HTTPException(
                    status_code=500,
                    detail="Upload image impossible.",
                ) from exc
        else:
            suffix = Path(upload.filename or "").suffix or ".jpg"
            filename = f"{uuid.uuid4().hex}{suffix}"
            file_path = target_dir / filename
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(upload.file, buffer)
            url = f"/uploads/properties/{property_id}/{filename}"
        photo = PropertyPhoto(
            id=uuid.uuid4(),
            property_id=prop.id,
            url=url,
            is_primary=existing_primary is None,
        )
        db.add(photo)
        if existing_primary is None:
            existing_primary = photo

    db.commit()
    db.refresh(prop)
    return prop


@router.post("/{property_id}/media", response_model=PropertyPublic)
def upload_property_media(
    property_id: uuid.UUID,
    video: UploadFile | None = File(None),
    tour_360: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if video is None and tour_360 is None:
        raise HTTPException(status_code=400, detail="Aucun fichier fourni.")

    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Logement introuvable.")
    if current_user.role != "admin" and prop.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Action interdite.")

    if not is_minio_configured():
        raise HTTPException(status_code=500, detail="MinIO non configuré.")

    try:
        if video is not None:
            if not video.content_type or not video.content_type.startswith("video/"):
                raise HTTPException(
                    status_code=400, detail="Le fichier video est invalide."
                )
            filename = build_object_key(
                f"properties/{property_id}/media/video",
                video.filename or "video.mp4",
            )
            prop.video_url = upload_file(video.file, filename, video.content_type)

        if tour_360 is not None:
            valid_types = ("image/", "video/")
            if not tour_360.content_type or not tour_360.content_type.startswith(
                valid_types
            ):
                raise HTTPException(
                    status_code=400, detail="Le fichier 360 est invalide."
                )
            filename = build_object_key(
                f"properties/{property_id}/media/tour-360",
                tour_360.filename or "tour-360.jpg",
            )
            prop.tour_360_url = upload_file(
                tour_360.file, filename, tour_360.content_type
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Upload MinIO impossible.") from exc

    db.commit()
    db.refresh(prop)
    return prop
