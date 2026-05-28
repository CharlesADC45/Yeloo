from fastapi import APIRouter

from app.api.routes import admin, auth, lease_requests, messages, owners, properties, public, push, users, visit_requests

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(properties.router, prefix="/properties", tags=["properties"])
api_router.include_router(public.router, prefix="/public", tags=["public"])
api_router.include_router(owners.router, prefix="/owners", tags=["owners"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(push.router, prefix="/push", tags=["push"])
api_router.include_router(
    lease_requests.router,
    prefix="/lease-requests",
    tags=["lease-requests"],
)
api_router.include_router(
    visit_requests.router,
    prefix="/visit-requests",
    tags=["visit-requests"],
)

