from __future__ import annotations

import shutil
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.storage import get_upload_dir
from app.core.storage_minio import build_object_key, is_minio_configured, upload_file
from app.core.security import get_current_admin
from app.db.deps import get_db
from app.models.conversation import Conversation
from app.models.feature_module import FeatureModule
from app.models.lease_request import LeaseRequest
from app.models.owner_profile import OwnerProfile
from app.models.property import Property
from app.models.public_announcement import PublicAnnouncement
from app.models.user import User
from app.schemas.admin import (
    AdminActivityItem,
    AdminCounts,
    AdminDashboardPublic,
    AdminLeaseSummary,
    AdminOwnerKycDecision,
    AdminOwnerKycSummary,
    AdminPropertyPromoUpdate,
    AdminPropertyStatusUpdate,
    AdminPropertySummary,
    AdminUserSummary,
    AdminUserSuspensionUpdate,
    AdminUserUpdate,
    FeatureModulePublic,
    FeatureModuleUpdate,
    PublicAnnouncementCreate,
    PublicAnnouncementPublic,
    PublicAnnouncementUpdate,
)

router = APIRouter()

DEFAULT_FEATURE_MODULES = [
    {
        "key": "public_explore",
        "name": "Explorer public",
        "description": "Autorise la consultation publique des logements depuis la home et les listes.",
        "category": "public",
    },
    {
        "key": "interactive_map",
        "name": "Carte interactive",
        "description": "Active la carte, les clusters et la navigation geographique des biens.",
        "category": "public",
    },
    {
        "key": "favorites",
        "name": "Favoris",
        "description": "Permet aux locataires de sauvegarder des logements et retrouver leurs coups de coeur.",
        "category": "tenant",
    },
    {
        "key": "owner_dashboard",
        "name": "Espace proprietaire",
        "description": "Active le dashboard proprietaire, la gestion des biens et les statistiques.",
        "category": "owner",
    },
    {
        "key": "owner_kyc",
        "name": "KYC proprietaire",
        "description": "Active la revue manuelle des dossiers proprietaires par le super admin.",
        "category": "owner",
    },
    {
        "key": "lease_requests",
        "name": "Demandes de bail",
        "description": "Reserve la zone bail pour les prochains workflows de location.",
        "category": "leasing",
    },
    {
        "key": "visit_requests",
        "name": "Demandes de visite",
        "description": "Permet aux locataires de demander une visite et aux proprietaires de repondre.",
        "category": "leasing",
    },
    {
        "key": "listing_chat",
        "name": "Chat des annonces",
        "description": "Autorise les conversations locataire-proprietaire depuis chaque annonce.",
        "category": "engagement",
    },
    {
        "key": "notifications",
        "name": "Notifications",
        "description": "Diffuse les notifications de nouvelles annonces et alertes utilisateurs.",
        "category": "engagement",
    },
    {
        "key": "public_announcements",
        "name": "Alertes publiques",
        "description": "Diffuse les messages publics en carousel sur l'accueil.",
        "category": "engagement",
    },
    {
        "key": "listing_promos",
        "name": "Promos annonces",
        "description": "Affiche les reductions et offres visibles sur les images des logements.",
        "category": "engagement",
    },
    {
        "key": "app_status_alerts",
        "name": "Alertes statut app",
        "description": "Affiche les alertes de connexion instable, hors ligne et nouveaux messages.",
        "category": "engagement",
    },
]


def _ensure_feature_modules(db: Session) -> list[FeatureModule]:
    existing = {item.key: item for item in db.query(FeatureModule).all()}
    touched = False
    for payload in DEFAULT_FEATURE_MODULES:
        if payload["key"] in existing:
            continue
        item = FeatureModule(
            key=payload["key"],
            name=payload["name"],
            description=payload["description"],
            category=payload["category"],
            is_enabled=True,
        )
        db.add(item)
        touched = True
        existing[item.key] = item
    if touched:
        db.commit()
    return sorted(existing.values(), key=lambda item: (item.category, item.name))


def _serialize_user(user: User) -> AdminUserSummary:
    owner_profile = getattr(user, "owner_profile", None)
    return AdminUserSummary(
        id=str(user.id),
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        is_verified=user.is_verified,
        is_suspended=user.is_suspended,
        created_at=user.created_at,
        owner_verification_status=owner_profile.verification_status if owner_profile else None,
    )


def _serialize_property(property_obj: Property) -> AdminPropertySummary:
    return AdminPropertySummary(
        id=str(property_obj.id),
        title=property_obj.title,
        description=property_obj.description,
        property_type=property_obj.property_type,
        city=property_obj.city,
        neighborhood=property_obj.neighborhood,
        address=property_obj.address,
        price=float(property_obj.price),
        price_period=property_obj.price_period,
        deposit_months=property_obj.deposit_months,
        advance_months=property_obj.advance_months,
        surface_m2=property_obj.surface_m2,
        rooms=property_obj.rooms,
        bathrooms=property_obj.bathrooms,
        is_furnished=property_obj.is_furnished,
        latitude=float(property_obj.latitude) if property_obj.latitude is not None else None,
        longitude=float(property_obj.longitude) if property_obj.longitude is not None else None,
        video_url=property_obj.video_url,
        tour_360_url=property_obj.tour_360_url,
        promo_label=property_obj.promo_label,
        promo_until=property_obj.promo_until,
        photo_urls=property_obj.photo_urls,
        is_verified_listing=property_obj.is_verified_listing,
        views_count=property_obj.views_count,
        owner_id=str(property_obj.owner_id) if property_obj.owner_id else None,
        status=property_obj.status,
        owner_name=property_obj.owner.full_name if property_obj.owner else None,
        owner_email=property_obj.owner.email if property_obj.owner else None,
        owner_phone=property_obj.owner.phone if property_obj.owner else None,
        owner_is_verified=property_obj.owner_is_verified,
        created_at=property_obj.created_at,
    )


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


def _normalize_announcement_url(value: str | None, field_name: str) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    if normalized.startswith(("http://", "https://", "/")):
        return normalized
    raise HTTPException(status_code=400, detail=f"{field_name} invalide.")


def _save_announcement_image(file: UploadFile) -> str:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Format d'image invalide.")

    if is_minio_configured():
        object_key = build_object_key("announcements", file.filename or "poster.jpg")
        return upload_file(file.file, object_key, file.content_type)

    upload_dir = get_upload_dir() / "announcements"
    upload_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "").suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        extension = ".jpg"

    filename = f"announcement-{uuid.uuid4().hex}{extension}"
    destination = upload_dir / filename
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return f"/uploads/announcements/{filename}"


def _serialize_lease(lease_request: LeaseRequest) -> AdminLeaseSummary:
    return AdminLeaseSummary(
        id=str(lease_request.id),
        property_title=lease_request.property_title,
        tenant_full_name=lease_request.tenant_full_name,
        tenant_email=lease_request.tenant_email,
        property_city=lease_request.property_city,
        status=lease_request.status,
        created_at=lease_request.created_at,
    )


def _serialize_owner_kyc(profile: OwnerProfile) -> AdminOwnerKycSummary:
    return AdminOwnerKycSummary(
        id=str(profile.id),
        user_id=str(profile.user_id),
        full_name=profile.user.full_name if profile.user else None,
        email=profile.user.email if profile.user else "",
        phone=profile.user.phone if profile.user else None,
        city=profile.city,
        verification_status=profile.verification_status,
        verification_notes=profile.verification_notes,
        identity_doc_name=profile.identity_doc_name,
        identity_selfie_name=profile.identity_selfie_name,
        property_proof_name=profile.property_proof_name,
        reviewed_at=profile.reviewed_at,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get("/dashboard", response_model=AdminDashboardPublic)
def get_admin_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    modules = _ensure_feature_modules(db)

    total_users = db.query(func.count(User.id)).scalar() or 0
    total_tenants = db.query(func.count(User.id)).filter(User.role == "locataire").scalar() or 0
    total_owners = db.query(func.count(User.id)).filter(User.role == "proprietaire").scalar() or 0
    total_admins = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
    verified_owners = (
        db.query(func.count(User.id))
        .filter(User.role == "proprietaire", User.is_verified.is_(True))
        .scalar()
        or 0
    )
    suspended_users = db.query(func.count(User.id)).filter(User.is_suspended.is_(True)).scalar() or 0
    pending_owner_kyc = (
        db.query(func.count(OwnerProfile.id))
        .filter(OwnerProfile.verification_status == "pending_review")
        .scalar()
        or 0
    )
    approved_owner_kyc = (
        db.query(func.count(OwnerProfile.id))
        .filter(OwnerProfile.verification_status == "approved")
        .scalar()
        or 0
    )
    rejected_owner_kyc = (
        db.query(func.count(OwnerProfile.id))
        .filter(OwnerProfile.verification_status == "rejected")
        .scalar()
        or 0
    )

    total_properties = db.query(func.count(Property.id)).scalar() or 0
    published_properties = db.query(func.count(Property.id)).filter(Property.status == "published").scalar() or 0
    draft_properties = db.query(func.count(Property.id)).filter(Property.status == "draft").scalar() or 0
    suspended_properties = db.query(func.count(Property.id)).filter(Property.status == "suspendu").scalar() or 0
    active_modules = len([module for module in modules if module.is_enabled])

    total_lease_requests = db.query(func.count(LeaseRequest.id)).scalar() or 0
    pending_lease_requests = (
        db.query(func.count(LeaseRequest.id)).filter(LeaseRequest.status == "submitted").scalar() or 0
    )
    approved_lease_requests = (
        db.query(func.count(LeaseRequest.id)).filter(LeaseRequest.status == "approved").scalar() or 0
    )
    rejected_lease_requests = (
        db.query(func.count(LeaseRequest.id)).filter(LeaseRequest.status == "rejected").scalar() or 0
    )

    recent_tenants = (
        db.query(User)
        .options(joinedload(User.owner_profile))
        .filter(User.role == "locataire")
        .order_by(User.created_at.desc())
        .limit(6)
        .all()
    )
    recent_owners = (
        db.query(User)
        .options(joinedload(User.owner_profile))
        .filter(User.role == "proprietaire")
        .order_by(User.created_at.desc())
        .limit(6)
        .all()
    )
    recent_properties = (
        db.query(Property)
        .options(joinedload(Property.owner))
        .order_by(Property.created_at.desc())
        .limit(8)
        .all()
    )
    recent_lease_requests = db.query(LeaseRequest).order_by(LeaseRequest.created_at.desc()).limit(8).all()

    recent_activities = sorted(
        [
            *[
                AdminActivityItem(
                    id=f"user-{user.id}",
                    type="user",
                    title=user.full_name or user.email,
                    description=f"Nouveau {user.role} inscrit",
                    created_at=user.created_at,
                    status="verified" if user.is_verified else "pending",
                )
                for user in recent_tenants[:3] + recent_owners[:3]
            ],
            *[
                AdminActivityItem(
                    id=f"property-{property_obj.id}",
                    type="property",
                    title=property_obj.title,
                    description=f"Publication a {property_obj.city}",
                    created_at=property_obj.created_at,
                    status=property_obj.status,
                )
                for property_obj in recent_properties[:4]
            ],
            *[
                AdminActivityItem(
                    id=f"lease-{lease_request.id}",
                    type="lease",
                    title=lease_request.property_title,
                    description=f"Demande de bail · {lease_request.tenant_full_name}",
                    created_at=lease_request.created_at,
                    status=lease_request.status,
                )
                for lease_request in recent_lease_requests[:4]
            ],
        ],
        key=lambda item: item.created_at,
        reverse=True,
    )[:10]

    return AdminDashboardPublic(
        counts=AdminCounts(
        total_users=total_users,
        total_tenants=total_tenants,
        total_owners=total_owners,
        total_admins=total_admins,
        verified_owners=verified_owners,
        pending_owner_kyc=pending_owner_kyc,
        approved_owner_kyc=approved_owner_kyc,
        rejected_owner_kyc=rejected_owner_kyc,
        suspended_users=suspended_users,
        total_properties=total_properties,
        published_properties=published_properties,
        draft_properties=draft_properties,
        suspended_properties=suspended_properties,
        active_modules=active_modules,
        total_lease_requests=total_lease_requests,
        pending_lease_requests=pending_lease_requests,
        approved_lease_requests=approved_lease_requests,
            rejected_lease_requests=rejected_lease_requests,
        ),
        modules=[FeatureModulePublic.model_validate(item) for item in modules],
        recent_tenants=[_serialize_user(item) for item in recent_tenants],
        recent_owners=[_serialize_user(item) for item in recent_owners],
        recent_properties=[_serialize_property(item) for item in recent_properties],
        recent_lease_requests=[_serialize_lease(item) for item in recent_lease_requests],
        recent_activities=recent_activities,
    )


@router.get("/modules", response_model=list[FeatureModulePublic])
def list_feature_modules(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return [FeatureModulePublic.model_validate(item) for item in _ensure_feature_modules(db)]


@router.patch("/modules/{module_key}", response_model=FeatureModulePublic)
def update_feature_module(
    module_key: str,
    payload: FeatureModuleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    _ensure_feature_modules(db)
    module = db.query(FeatureModule).filter(FeatureModule.key == module_key).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module introuvable.")
    module.is_enabled = payload.is_enabled
    db.add(module)
    db.commit()
    db.refresh(module)
    return FeatureModulePublic.model_validate(module)


@router.get("/users", response_model=list[AdminUserSummary])
def list_admin_users(
    role: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    query = db.query(User).options(joinedload(User.owner_profile)).order_by(User.created_at.desc())
    if role in {"locataire", "proprietaire", "admin"}:
        query = query.filter(User.role == role)
    return [_serialize_user(item) for item in query.limit(100).all()]


@router.patch("/users/{user_id}/suspension", response_model=AdminUserSummary)
def update_user_suspension(
    user_id: str,
    payload: AdminUserSuspensionUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    user = db.query(User).options(joinedload(User.owner_profile)).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if user.id == current_admin.id and payload.is_suspended:
        raise HTTPException(status_code=400, detail="Le super admin connecte ne peut pas se suspendre lui-meme.")
    user.is_suspended = payload.is_suspended
    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize_user(user)


@router.patch("/users/{user_id}", response_model=AdminUserSummary)
def update_admin_user(
    user_id: str,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    user = db.query(User).options(joinedload(User.owner_profile)).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    data = payload.model_dump(exclude_unset=True)
    next_email = data.get("email")
    if next_email:
        next_email = next_email.strip().lower()
        existing = db.query(User).filter(User.email == next_email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est deja utilise.")
        user.email = next_email

    if "phone" in data:
        next_phone = (data.get("phone") or "").strip() or None
        if next_phone:
            existing = db.query(User).filter(User.phone == next_phone, User.id != user.id).first()
            if existing:
                raise HTTPException(status_code=400, detail="Ce telephone est deja utilise.")
        user.phone = next_phone

    if "full_name" in data:
        user.full_name = (data.get("full_name") or "").strip() or None

    if "role" in data and data.get("role"):
        next_role = data["role"]
        if next_role not in {"locataire", "proprietaire", "admin"}:
            raise HTTPException(status_code=400, detail="Role invalide.")
        if user.id == current_admin.id and next_role != "admin":
            raise HTTPException(
                status_code=400,
                detail="Le super admin connecte ne peut pas retirer son propre role admin.",
            )
        user.role = next_role

    if "is_verified" in data and data.get("is_verified") is not None:
        user.is_verified = bool(data["is_verified"])

    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize_user(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="Le super admin connecte ne peut pas supprimer son propre compte.",
        )

    upload_root = get_upload_dir()

    properties = db.query(Property).filter(Property.owner_id == user.id).all()
    for property_obj in properties:
        property_dir = upload_root / "properties" / str(property_obj.id)
        if property_dir.exists():
            shutil.rmtree(property_dir, ignore_errors=True)

    conversations = (
        db.query(Conversation)
        .filter(or_(Conversation.owner_id == user.id, Conversation.tenant_id == user.id))
        .all()
    )
    for conversation in conversations:
        db.delete(conversation)

    lease_requests = (
        db.query(LeaseRequest)
        .filter(or_(LeaseRequest.owner_id == user.id, LeaseRequest.tenant_id == user.id))
        .all()
    )
    for lease_request in lease_requests:
        db.delete(lease_request)

    for profile in db.query(OwnerProfile).filter(OwnerProfile.reviewed_by == user.id).all():
        profile.reviewed_by = None
        profile.reviewed_at = None
        db.add(profile)

    owner_profile = db.query(OwnerProfile).filter(OwnerProfile.user_id == user.id).first()
    if owner_profile:
        db.delete(owner_profile)

    for property_obj in properties:
        db.delete(property_obj)

    avatar_url = user.profile_image_url or ""
    if avatar_url.startswith("/uploads/avatars/"):
        avatar_path = upload_root / avatar_url.removeprefix("/uploads/")
        if avatar_path.exists():
            avatar_path.unlink(missing_ok=True)

    db.delete(user)
    db.commit()
    return None


@router.get("/properties", response_model=list[AdminPropertySummary])
def list_admin_properties(
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    query = db.query(Property).options(joinedload(Property.owner)).order_by(Property.created_at.desc())
    if status in {"draft", "published", "suspendu"}:
        query = query.filter(Property.status == status)
    return [_serialize_property(item) for item in query.limit(120).all()]


@router.patch("/properties/{property_id}/status", response_model=AdminPropertySummary)
def update_admin_property_status(
    property_id: str,
    payload: AdminPropertyStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    if payload.status not in {"draft", "published", "suspendu"}:
        raise HTTPException(status_code=400, detail="Statut invalide.")
    property_obj = db.query(Property).options(joinedload(Property.owner)).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Publication introuvable.")
    property_obj.status = payload.status
    db.add(property_obj)
    db.commit()
    db.refresh(property_obj)
    return _serialize_property(property_obj)


@router.patch("/properties/{property_id}/promo", response_model=AdminPropertySummary)
def update_admin_property_promo(
    property_id: str,
    payload: AdminPropertyPromoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    property_obj = db.query(Property).options(joinedload(Property.owner)).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Publication introuvable.")

    if payload.clear:
        property_obj.promo_label = None
        property_obj.promo_until = None
    else:
        label = (payload.promo_label or "").strip()
        if not label:
            raise HTTPException(status_code=400, detail="Texte de promo requis.")
        if not payload.duration_hours:
            raise HTTPException(status_code=400, detail="Duree de promo requise.")
        property_obj.promo_label = label
        property_obj.promo_until = datetime.utcnow() + timedelta(hours=payload.duration_hours)

    db.add(property_obj)
    db.commit()
    db.refresh(property_obj)
    return _serialize_property(property_obj)


@router.get("/public-announcements", response_model=list[PublicAnnouncementPublic])
def list_public_announcements(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    items = db.query(PublicAnnouncement).order_by(PublicAnnouncement.created_at.desc()).limit(100).all()
    return [_serialize_public_announcement(item) for item in items]


@router.post("/public-announcements/upload-image")
def upload_public_announcement_image(
    file: UploadFile = File(...),
    _: User = Depends(get_current_admin),
):
    return {"url": _save_announcement_image(file)}


@router.post("/public-announcements", response_model=PublicAnnouncementPublic, status_code=status.HTTP_201_CREATED)
def create_public_announcement(
    payload: PublicAnnouncementCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    now = datetime.utcnow()
    item = PublicAnnouncement(
        message=payload.message.strip(),
        icon=payload.icon.strip() or "info",
        image_url=_normalize_announcement_url(payload.image_url, "Image"),
        link_url=_normalize_announcement_url(payload.link_url, "Lien"),
        cta_label=(payload.cta_label or "").strip() or None,
        target_audience=payload.target_audience,
        duration_hours=payload.duration_hours,
        is_active=payload.is_active,
        starts_at=now,
        expires_at=now + timedelta(hours=payload.duration_hours),
        created_at=now,
        updated_at=now,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize_public_announcement(item)


@router.patch("/public-announcements/{announcement_id}", response_model=PublicAnnouncementPublic)
def update_public_announcement(
    announcement_id: str,
    payload: PublicAnnouncementUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    item = db.query(PublicAnnouncement).filter(PublicAnnouncement.id == announcement_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Notification publique introuvable.")

    data = payload.model_dump(exclude_unset=True)
    if "message" in data and data["message"] is not None:
        item.message = data["message"].strip()
    if "icon" in data and data["icon"] is not None:
        item.icon = data["icon"].strip() or "info"
    if "image_url" in data:
        item.image_url = _normalize_announcement_url(data.get("image_url"), "Image")
    if "link_url" in data:
        item.link_url = _normalize_announcement_url(data.get("link_url"), "Lien")
    if "cta_label" in data:
        item.cta_label = (data.get("cta_label") or "").strip() or None
    if "target_audience" in data and data["target_audience"] is not None:
        item.target_audience = data["target_audience"]
    if "duration_hours" in data and data["duration_hours"] is not None:
        item.duration_hours = data["duration_hours"]
        item.expires_at = datetime.utcnow() + timedelta(hours=data["duration_hours"])
    if "is_active" in data and data["is_active"] is not None:
        item.is_active = bool(data["is_active"])
    item.updated_at = datetime.utcnow()

    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize_public_announcement(item)


@router.delete("/public-announcements/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_public_announcement(
    announcement_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    item = db.query(PublicAnnouncement).filter(PublicAnnouncement.id == announcement_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Notification publique introuvable.")
    db.delete(item)
    db.commit()
    return None


@router.get("/lease-requests", response_model=list[AdminLeaseSummary])
def list_admin_lease_requests(
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    query = db.query(LeaseRequest).order_by(LeaseRequest.created_at.desc())
    if status in {"draft", "submitted", "approved", "rejected"}:
        query = query.filter(LeaseRequest.status == status)
    return [_serialize_lease(item) for item in query.limit(120).all()]


@router.get("/owner-kyc", response_model=list[AdminOwnerKycSummary])
def list_owner_kyc_queue(
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    _ensure_feature_modules(db)
    query = (
        db.query(OwnerProfile)
        .options(joinedload(OwnerProfile.user))
        .order_by(OwnerProfile.updated_at.desc())
    )
    if status in {"draft", "pending_review", "approved", "rejected"}:
        query = query.filter(OwnerProfile.verification_status == status)
    return [_serialize_owner_kyc(item) for item in query.limit(150).all()]


@router.get("/owner-kyc/{profile_id}", response_model=AdminOwnerKycSummary)
def get_owner_kyc_detail(
    profile_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    profile = (
        db.query(OwnerProfile)
        .options(joinedload(OwnerProfile.user))
        .filter(OwnerProfile.id == profile_id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Dossier KYC introuvable.")
    return _serialize_owner_kyc(profile)


@router.patch("/owner-kyc/{profile_id}", response_model=AdminOwnerKycSummary)
def review_owner_kyc(
    profile_id: str,
    payload: AdminOwnerKycDecision,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    if payload.decision not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Decision invalide.")
    notes = payload.notes.strip() if payload.notes else None
    if payload.decision == "rejected" and not notes:
        raise HTTPException(status_code=400, detail="Motif de rejet requis.")

    profile = (
        db.query(OwnerProfile)
        .options(joinedload(OwnerProfile.user))
        .filter(OwnerProfile.id == profile_id)
        .first()
    )
    if not profile or not profile.user:
        raise HTTPException(status_code=404, detail="Dossier KYC introuvable.")

    profile.verification_status = payload.decision
    profile.verification_notes = notes
    profile.reviewed_by = current_admin.id
    profile.reviewed_at = datetime.utcnow()
    profile.user.is_verified = payload.decision == "approved"
    if payload.decision == "approved" and profile.user.trust_badge == "none":
        profile.user.trust_badge = "identity"

    db.add(profile)
    db.add(profile.user)
    db.commit()
    db.refresh(profile)
    return _serialize_owner_kyc(profile)
