from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_admin
from app.db.deps import get_db
from app.models.feature_module import FeatureModule
from app.models.lease_request import LeaseRequest
from app.models.owner_profile import OwnerProfile
from app.models.property import Property
from app.models.user import User
from app.schemas.admin import (
    AdminActivityItem,
    AdminCounts,
    AdminDashboardPublic,
    AdminLeaseSummary,
    AdminOwnerKycDecision,
    AdminOwnerKycSummary,
    AdminPropertyStatusUpdate,
    AdminPropertySummary,
    AdminUserSummary,
    AdminUserSuspensionUpdate,
    FeatureModulePublic,
    FeatureModuleUpdate,
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
        city=property_obj.city,
        neighborhood=property_obj.neighborhood,
        price=float(property_obj.price),
        price_period=property_obj.price_period,
        deposit_months=property_obj.deposit_months,
        status=property_obj.status,
        owner_name=property_obj.owner.full_name if property_obj.owner else None,
        created_at=property_obj.created_at,
    )


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

    profile = (
        db.query(OwnerProfile)
        .options(joinedload(OwnerProfile.user))
        .filter(OwnerProfile.id == profile_id)
        .first()
    )
    if not profile or not profile.user:
        raise HTTPException(status_code=404, detail="Dossier KYC introuvable.")

    profile.verification_status = payload.decision
    profile.verification_notes = payload.notes.strip() if payload.notes else None
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
