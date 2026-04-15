import logging
import time
from collections import defaultdict

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.storage_minio import ensure_bucket, get_minio_client, is_minio_configured
from app.core.storage import get_upload_dir
from app.api.router import api_router
from app.db.init_db import init_db


logger = logging.getLogger(__name__)

REQUEST_COUNT: dict[tuple[str, str, int], int] = defaultdict(int)
REQUEST_DURATION_SUM: dict[tuple[str, str], float] = defaultdict(float)
REQUEST_DURATION_COUNT: dict[tuple[str, str], int] = defaultdict(int)


def _route_label(request: Request) -> str:
    route = request.scope.get("route")
    path = getattr(route, "path", None)
    return path or request.url.path


def _record_request(method: str, path: str, status_code: int, duration: float) -> None:
    REQUEST_COUNT[(method, path, status_code)] += 1
    REQUEST_DURATION_SUM[(method, path)] += duration
    REQUEST_DURATION_COUNT[(method, path)] += 1


def _render_metrics() -> str:
    lines = [
        "# HELP yeloo_http_requests_total Total HTTP requests handled by the API.",
        "# TYPE yeloo_http_requests_total counter",
    ]

    for (method, path, status), count in sorted(REQUEST_COUNT.items()):
        lines.append(
            f'yeloo_http_requests_total{{method="{method}",path="{path}",status="{status}"}} {count}'
        )

    lines.extend(
        [
            "# HELP yeloo_http_request_duration_seconds_sum Total request duration in seconds.",
            "# TYPE yeloo_http_request_duration_seconds_sum counter",
        ]
    )
    for (method, path), duration_sum in sorted(REQUEST_DURATION_SUM.items()):
        lines.append(
            f'yeloo_http_request_duration_seconds_sum{{method="{method}",path="{path}"}} {duration_sum:.6f}'
        )

    lines.extend(
        [
            "# HELP yeloo_http_request_duration_seconds_count Number of measured requests.",
            "# TYPE yeloo_http_request_duration_seconds_count counter",
        ]
    )
    for (method, path), count in sorted(REQUEST_DURATION_COUNT.items()):
        lines.append(
            f'yeloo_http_request_duration_seconds_count{{method="{method}",path="{path}"}} {count}'
        )

    return "\n".join(lines) + "\n"


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

    @app.middleware("http")
    async def record_metrics(request: Request, call_next):
        start = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            _record_request(
                request.method,
                _route_label(request),
                status_code,
                time.perf_counter() - start,
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

    @app.get("/metrics", tags=["system"])
    async def metrics():
        return Response(_render_metrics(), media_type="text/plain; version=0.0.4")

    upload_dir = get_upload_dir()
    app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

    app.include_router(api_router, prefix="/api")
    return app


app = create_app()

