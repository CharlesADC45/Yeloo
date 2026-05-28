from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg2://user:pass@localhost:5432/immoconnect"
    secret_key: str = "change_me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 30

    frontend_origin: str = "http://localhost:3000"
    frontend_origins: list[str] | None = None
    upload_dir: str = "uploads"
    bootstrap_admin_email: str = "admin@yeloo.ci"
    bootstrap_admin_phone: str = "+2250102035544"
    bootstrap_admin_password: str = "AdminYeloo123!"
    bootstrap_admin_full_name: str = "Super Admin Yeloo"

    minio_endpoint: str | None = None
    minio_access_key: str | None = None
    minio_secret_key: str | None = None
    minio_bucket: str = "yeloo"
    minio_secure: bool = False
    minio_public_url: str | None = None
    minio_public_url_is_bucket_root: bool = False
    vapid_public_key: str | None = None
    vapid_private_key: str | None = None
    vapid_subject: str = "mailto:admin@yeloo.ci"

    @field_validator("frontend_origins", mode="before")
    @classmethod
    def split_origins(cls, value):
        if value is None or value == "":
            return None
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, list):
            return value
        return None


settings = Settings()

