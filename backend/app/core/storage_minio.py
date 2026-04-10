from __future__ import annotations

import uuid
from pathlib import Path
from typing import IO

from minio import Minio

from app.core.config import settings


def is_minio_configured() -> bool:
    return all(
        [
            settings.minio_endpoint,
            settings.minio_access_key,
            settings.minio_secret_key,
            settings.minio_bucket,
        ]
    )


def get_minio_client() -> Minio:
    if not is_minio_configured():
        raise RuntimeError("MinIO non configuré.")
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


def ensure_bucket(client: Minio) -> None:
    bucket = settings.minio_bucket
    if bucket is None:
        raise RuntimeError("Bucket MinIO manquant.")
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)


def build_public_url(object_key: str) -> str:
    bucket = settings.minio_bucket
    if settings.minio_public_url:
        base = settings.minio_public_url.rstrip("/")
        if settings.minio_public_url_is_bucket_root:
            return f"{base}/{object_key}"
        return f"{base}/{bucket}/{object_key}"
    protocol = "https" if settings.minio_secure else "http"
    return f"{protocol}://{settings.minio_endpoint}/{bucket}/{object_key}"


def upload_file(file_obj: IO[bytes], object_key: str, content_type: str | None) -> str:
    client = get_minio_client()
    ensure_bucket(client)
    try:
        file_obj.seek(0)
    except Exception:
        pass
    client.put_object(
        settings.minio_bucket,
        object_key,
        file_obj,
        length=-1,
        part_size=10 * 1024 * 1024,
        content_type=content_type or "application/octet-stream",
    )
    return build_public_url(object_key)


def build_object_key(prefix: str, filename: str) -> str:
    suffix = Path(filename).suffix or ".bin"
    return f"{prefix}/{uuid.uuid4().hex}{suffix}"
