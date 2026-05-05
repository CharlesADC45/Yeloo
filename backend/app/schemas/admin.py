from datetime import datetime

from pydantic import BaseModel, Field


class FeatureModulePublic(BaseModel):
    key: str
    name: str
    description: str
    category: str
    is_enabled: bool
    config_value: int | None = None
    updated_at: datetime

    class Config:
        from_attributes = True


class FeatureModuleUpdate(BaseModel):
    is_enabled: bool
    config_value: int | None = None


class AdminUserSummary(BaseModel):
    id: str
    full_name: str | None = None
    email: str
    phone: str | None = None
    role: str
    is_verified: bool
    is_suspended: bool
    failed_login_attempts: int = 0
    is_login_locked: bool = False
    created_at: datetime
    owner_verification_status: str | None = None


class AdminPropertySummary(BaseModel):
    id: str
    title: str
    description: str | None = None
    property_type: str | None = None
    city: str
    neighborhood: str | None = None
    address: str | None = None
    price: float
    price_period: str
    deposit_months: int | None = None
    advance_months: int | None = None
    surface_m2: int | None = None
    rooms: int | None = None
    bathrooms: int | None = None
    is_furnished: bool = False
    latitude: float | None = None
    longitude: float | None = None
    video_url: str | None = None
    tour_360_url: str | None = None
    promo_label: str | None = None
    promo_until: datetime | None = None
    photo_urls: list[str] = []
    is_verified_listing: bool = False
    views_count: int = 0
    owner_id: str | None = None
    status: str
    owner_name: str | None = None
    owner_email: str | None = None
    owner_phone: str | None = None
    owner_is_verified: bool = False
    created_at: datetime


class AdminLeaseSummary(BaseModel):
    id: str
    property_title: str
    tenant_full_name: str
    tenant_email: str
    property_city: str
    status: str
    created_at: datetime


class AdminActivityItem(BaseModel):
    id: str
    type: str
    title: str
    description: str
    created_at: datetime
    status: str | None = None


class AdminOwnerKycSummary(BaseModel):
    id: str
    user_id: str
    full_name: str | None = None
    email: str
    phone: str | None = None
    city: str
    verification_status: str
    verification_notes: str | None = None
    identity_doc_name: str | None = None
    identity_selfie_name: str | None = None
    property_proof_name: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class AdminOwnerKycDecision(BaseModel):
    decision: str
    notes: str | None = None


class AdminCounts(BaseModel):
    total_users: int
    total_tenants: int
    total_owners: int
    total_admins: int
    verified_owners: int
    pending_owner_kyc: int
    approved_owner_kyc: int
    rejected_owner_kyc: int
    suspended_users: int
    total_properties: int
    published_properties: int
    draft_properties: int
    suspended_properties: int
    active_modules: int
    total_lease_requests: int
    pending_lease_requests: int
    approved_lease_requests: int
    rejected_lease_requests: int


class AdminDashboardPublic(BaseModel):
    counts: AdminCounts
    modules: list[FeatureModulePublic]
    recent_tenants: list[AdminUserSummary]
    recent_owners: list[AdminUserSummary]
    recent_properties: list[AdminPropertySummary]
    recent_lease_requests: list[AdminLeaseSummary]
    recent_activities: list[AdminActivityItem]


class AdminUserSuspensionUpdate(BaseModel):
    is_suspended: bool


class AdminUserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    role: str | None = None
    is_verified: bool | None = None


class AdminPropertyStatusUpdate(BaseModel):
    status: str


class AdminPropertyPromoUpdate(BaseModel):
    promo_label: str | None = Field(default=None, max_length=80)
    duration_hours: int | None = Field(default=None, ge=1, le=2160)
    clear: bool = False


class PublicAnnouncementPublic(BaseModel):
    id: str
    message: str
    icon: str
    display_mode: str = "text"
    image_url: str | None = None
    link_url: str | None = None
    cta_label: str | None = None
    font_family: str | None = None
    text_color: str | None = None
    text_size: str | None = None
    text_position: str | None = None
    content_inset: str | None = None
    overlay_strength: str | None = None
    target_audience: str
    duration_hours: int
    is_active: bool
    starts_at: datetime
    expires_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PublicAnnouncementCreate(BaseModel):
    message: str = Field(min_length=3, max_length=500)
    icon: str = Field(default="info", max_length=40)
    display_mode: str = Field(default="text", pattern="^(text|poster_auto|poster_manual)$")
    image_url: str | None = Field(default=None, max_length=1000)
    link_url: str | None = Field(default=None, max_length=1000)
    cta_label: str | None = Field(default=None, max_length=80)
    font_family: str | None = Field(default=None, max_length=24)
    text_color: str | None = Field(default=None, max_length=32)
    text_size: str | None = Field(default=None, max_length=24)
    text_position: str | None = Field(default=None, pattern="^(left|right|top|bottom|center)$")
    content_inset: str | None = Field(default=None, pattern="^(compact|comfortable|airy)$")
    overlay_strength: str | None = Field(default=None, pattern="^(soft|medium|strong)$")
    target_audience: str = Field(default="all", pattern="^(all|locataire|proprietaire)$")
    duration_hours: int = Field(default=24, ge=1, le=2160)
    is_active: bool = True


class PublicAnnouncementUpdate(BaseModel):
    message: str | None = Field(default=None, min_length=3, max_length=500)
    icon: str | None = Field(default=None, max_length=40)
    display_mode: str | None = Field(default=None, pattern="^(text|poster_auto|poster_manual)$")
    image_url: str | None = Field(default=None, max_length=1000)
    link_url: str | None = Field(default=None, max_length=1000)
    cta_label: str | None = Field(default=None, max_length=80)
    font_family: str | None = Field(default=None, max_length=24)
    text_color: str | None = Field(default=None, max_length=32)
    text_size: str | None = Field(default=None, max_length=24)
    text_position: str | None = Field(default=None, pattern="^(left|right|top|bottom|center)$")
    content_inset: str | None = Field(default=None, pattern="^(compact|comfortable|airy)$")
    overlay_strength: str | None = Field(default=None, pattern="^(soft|medium|strong)$")
    target_audience: str | None = Field(default=None, pattern="^(all|locataire|proprietaire)$")
    duration_hours: int | None = Field(default=None, ge=1, le=2160)
    is_active: bool | None = None
