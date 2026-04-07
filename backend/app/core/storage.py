from pathlib import Path

from app.core.config import settings


def get_upload_dir() -> Path:
    base = Path(settings.upload_dir)
    if not base.is_absolute():
        base = Path(__file__).resolve().parents[2] / settings.upload_dir
    base.mkdir(parents=True, exist_ok=True)
    return base
