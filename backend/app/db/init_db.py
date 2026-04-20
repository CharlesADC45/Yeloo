from sqlalchemy import inspect, text

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.db.base import Base
from app.db.session import engine
from app.models.feature_module import FeatureModule
from app.models.user import User
from app.db.session import SessionLocal
from app import models  # noqa: F401


DEFAULT_FEATURE_MODULES = [
    ("public_explore", "Explorer public", "Autorise la consultation publique des logements depuis la home et les listes.", "public"),
    ("interactive_map", "Carte interactive", "Active la carte, les clusters et la navigation geographique des biens.", "public"),
    ("favorites", "Favoris", "Permet aux locataires de sauvegarder des logements et retrouver leurs coups de coeur.", "tenant"),
    ("owner_dashboard", "Espace proprietaire", "Active le dashboard proprietaire, la gestion des biens et les statistiques.", "owner"),
    ("owner_kyc", "KYC proprietaire", "Active la revue manuelle des dossiers proprietaires par le super admin.", "owner"),
    ("lease_requests", "Demandes de bail", "Reserve la zone bail pour les prochains workflows de location.", "leasing"),
    ("listing_chat", "Chat des annonces", "Autorise les conversations locataire-proprietaire depuis chaque annonce.", "engagement"),
    ("notifications", "Notifications", "Diffuse les notifications de nouvelles annonces et alertes utilisateurs.", "engagement"),
]


def _ensure_lease_request_v2_columns() -> None:
    inspector = inspect(engine)
    if "lease_requests" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("lease_requests")}
    statements: list[str] = []

    if "owner_signature_data" not in existing_columns:
        statements.append(
            "ALTER TABLE lease_requests ADD COLUMN IF NOT EXISTS owner_signature_data TEXT"
        )
    if "owner_signed_at" not in existing_columns:
        statements.append(
            "ALTER TABLE lease_requests ADD COLUMN IF NOT EXISTS owner_signed_at TIMESTAMP WITH TIME ZONE"
        )

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _ensure_feature_modules_table() -> None:
    inspector = inspect(engine)
    if "feature_modules" in inspector.get_table_names():
        return

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS feature_modules (
                    key VARCHAR(100) PRIMARY KEY,
                    name VARCHAR(160) NOT NULL,
                    description TEXT NOT NULL,
                    category VARCHAR(80) NOT NULL DEFAULT 'general',
                    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                )
                """
            )
        )


def _ensure_owner_profile_kyc_columns() -> None:
    inspector = inspect(engine)
    if "owner_profiles" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("owner_profiles")}
    statements: list[str] = []

    if "identity_selfie_name" not in existing_columns:
        statements.append("ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS identity_selfie_name VARCHAR(300)")
    if "verification_status" not in existing_columns:
        statements.append(
            "ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) NOT NULL DEFAULT 'draft'"
        )
    if "verification_notes" not in existing_columns:
        statements.append("ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS verification_notes TEXT")
    if "reviewed_by" not in existing_columns:
        statements.append("ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS reviewed_by UUID")
    if "reviewed_at" not in existing_columns:
        statements.append("ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _ensure_property_payment_columns() -> None:
    inspector = inspect(engine)
    if "properties" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("properties")}
    statements: list[str] = []

    if "deposit_months" not in existing_columns:
        statements.append("ALTER TABLE properties ADD COLUMN IF NOT EXISTS deposit_months INTEGER")
    if "advance_months" not in existing_columns:
        statements.append("ALTER TABLE properties ADD COLUMN IF NOT EXISTS advance_months INTEGER")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _seed_default_feature_modules() -> None:
    db = SessionLocal()
    try:
        existing_keys = {key for (key,) in db.query(FeatureModule.key).all()}
        touched = False
        for key, name, description, category in DEFAULT_FEATURE_MODULES:
            if key in existing_keys:
                continue
            db.add(
                FeatureModule(
                    key=key,
                    name=name,
                    description=description,
                    category=category,
                    is_enabled=True,
                )
            )
            touched = True
        if touched:
            db.commit()
    finally:
        db.close()


def _ensure_bootstrap_super_admin() -> None:
    candidate_emails = [
        settings.bootstrap_admin_email.lower(),
        "adminin@gmail.com",
        "adminzoro@gmail.com",
    ]

    db = SessionLocal()
    try:
        admin_users = (
            db.query(User)
            .filter(User.email.in_(candidate_emails))
            .order_by(User.created_at.asc())
            .all()
        )

        if admin_users:
            changed = False
            for admin_user in admin_users:
                if admin_user.role != "admin":
                    admin_user.role = "admin"
                    changed = True
                if not admin_user.is_verified:
                    admin_user.is_verified = True
                    changed = True
                if not verify_password(settings.bootstrap_admin_password, admin_user.hashed_password):
                    admin_user.hashed_password = hash_password(settings.bootstrap_admin_password)
                    changed = True
                if admin_user.trust_badge != "full":
                    admin_user.trust_badge = "full"
                    changed = True
                if not admin_user.full_name:
                    admin_user.full_name = settings.bootstrap_admin_full_name
                    changed = True
                db.add(admin_user)
            if changed:
                db.commit()
            return

        new_admin = User(
            email=settings.bootstrap_admin_email.lower(),
            full_name=settings.bootstrap_admin_full_name,
            hashed_password=hash_password(settings.bootstrap_admin_password),
            role="admin",
            is_verified=True,
            trust_badge="full",
        )
        db.add(new_admin)
        db.commit()
    finally:
        db.close()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_feature_modules_table()
    _ensure_lease_request_v2_columns()
    _ensure_owner_profile_kyc_columns()
    _ensure_property_payment_columns()
    _seed_default_feature_modules()
    _ensure_bootstrap_super_admin()
