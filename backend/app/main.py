import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.storage_minio import ensure_bucket, get_minio_client, is_minio_configured
from app.core.storage import get_upload_dir
from app.api.router import api_router
from app.db.init_db import init_db


logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title="ImmoConnect CI API",
        version="0.1.0",
    )

    origins = settings.frontend_origins or [settings.frontend_origin]
    if settings.frontend_origin.startswith("http://localhost"):
        origins.append(settings.frontend_origin.replace("localhost", "127.0.0.1"))
    origins = list(dict.fromkeys(origins))

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    async def on_startup():
        init_db()
        if is_minio_configured():
            try:
                client = get_minio_client()
                ensure_bucket(client)
            except Exception:
                logger.warning("MinIO indisponible au démarrage.")

    @app.get("/health", tags=["system"])
    async def health_check():
        return {"status": "ok"}

    upload_dir = get_upload_dir()
    app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

    app.include_router(api_router, prefix="/api")
    return app


app = create_app()

