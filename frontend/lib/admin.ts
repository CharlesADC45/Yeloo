import { getApiBaseUrl } from "@/lib/api";

export type AdminCounts = {
  total_users: number;
  total_tenants: number;
  total_owners: number;
  total_admins: number;
  verified_owners: number;
  pending_owner_kyc: number;
  approved_owner_kyc: number;
  rejected_owner_kyc: number;
  suspended_users: number;
  total_properties: number;
  published_properties: number;
  draft_properties: number;
  suspended_properties: number;
  active_modules: number;
  total_lease_requests: number;
  pending_lease_requests: number;
  approved_lease_requests: number;
  rejected_lease_requests: number;
};

export type FeatureModule = {
  key: string;
  name: string;
  description: string;
  category: string;
  is_enabled: boolean;
  updated_at: string;
};

export type AdminUserSummary = {
  id: string;
  full_name?: string | null;
  email: string;
  phone?: string | null;
  role: string;
  is_verified: boolean;
  is_suspended: boolean;
  created_at: string;
  owner_verification_status?: string | null;
};

export type AdminUserUpdatePayload = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  is_verified?: boolean | null;
};

export type AdminPropertySummary = {
  id: string;
  title: string;
  description?: string | null;
  property_type?: string | null;
  city: string;
  neighborhood?: string | null;
  address?: string | null;
  price: number;
  price_period: string;
  deposit_months?: number | null;
  advance_months?: number | null;
  surface_m2?: number | null;
  rooms?: number | null;
  bathrooms?: number | null;
  is_furnished?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  video_url?: string | null;
  tour_360_url?: string | null;
  promo_label?: string | null;
  promo_until?: string | null;
  photo_urls?: string[];
  is_verified_listing?: boolean;
  views_count?: number;
  owner_id?: string | null;
  status: string;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  owner_is_verified?: boolean;
  created_at: string;
};

export type PublicAnnouncement = {
  id: string;
  message: string;
  icon: string;
  target_audience: "all" | "locataire" | "proprietaire";
  duration_hours: number;
  is_active: boolean;
  starts_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type AdminLeaseSummary = {
  id: string;
  property_title: string;
  tenant_full_name: string;
  tenant_email: string;
  property_city: string;
  status: string;
  created_at: string;
};

export type AdminActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
  status?: string | null;
};

export type AdminOwnerKycSummary = {
  id: string;
  user_id: string;
  full_name?: string | null;
  email: string;
  phone?: string | null;
  city: string;
  verification_status: string;
  verification_notes?: string | null;
  identity_doc_name?: string | null;
  identity_selfie_name?: string | null;
  property_proof_name?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminDashboard = {
  counts: AdminCounts;
  modules: FeatureModule[];
  recent_tenants: AdminUserSummary[];
  recent_owners: AdminUserSummary[];
  recent_properties: AdminPropertySummary[];
  recent_lease_requests: AdminLeaseSummary[];
  recent_activities: AdminActivityItem[];
};

export async function fetchAdminDashboard(token: string): Promise<AdminDashboard> {
  const response = await fetch(`${getApiBaseUrl()}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || "Impossible de charger le dashboard admin.");
  }
  return response.json();
}

export async function updateFeatureModule(
  token: string,
  key: string,
  isEnabled: boolean
): Promise<FeatureModule> {
  const response = await fetch(`${getApiBaseUrl()}/api/admin/modules/${key}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ is_enabled: isEnabled }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || "Impossible de mettre à jour le module.");
  }
  return response.json();
}

async function apiGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || "Erreur API admin.");
  }
  return response.json();
}

async function apiPatch<T>(path: string, token: string, body: unknown): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || "Erreur de mise à jour admin.");
  }
  return response.json();
}

async function apiPost<T>(path: string, token: string, body: unknown): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || "Creation impossible.");
  }
  return response.json();
}

async function apiDelete(path: string, token: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 204) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || "Suppression impossible.");
  }
}

export function fetchAdminUsers(token: string, role?: string) {
  const query = role ? `?role=${encodeURIComponent(role)}` : "";
  return apiGet<AdminUserSummary[]>(`/api/admin/users${query}`, token);
}

export function updateAdminUserSuspension(token: string, userId: string, isSuspended: boolean) {
  return apiPatch<AdminUserSummary>(`/api/admin/users/${userId}/suspension`, token, {
    is_suspended: isSuspended,
  });
}

export function updateAdminUser(token: string, userId: string, payload: AdminUserUpdatePayload) {
  return apiPatch<AdminUserSummary>(`/api/admin/users/${userId}`, token, payload);
}

export function deleteAdminUser(token: string, userId: string) {
  return apiDelete(`/api/admin/users/${userId}`, token);
}

export function fetchAdminProperties(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiGet<AdminPropertySummary[]>(`/api/admin/properties${query}`, token);
}

export function updateAdminPropertyStatus(token: string, propertyId: string, status: string) {
  return apiPatch<AdminPropertySummary>(`/api/admin/properties/${propertyId}/status`, token, {
    status,
  });
}

export function updateAdminPropertyPromo(
  token: string,
  propertyId: string,
  payload: { promo_label?: string | null; duration_hours?: number | null; clear?: boolean }
) {
  return apiPatch<AdminPropertySummary>(`/api/admin/properties/${propertyId}/promo`, token, payload);
}

export function deleteAdminProperty(token: string, propertyId: string) {
  return apiDelete(`/api/properties/${propertyId}`, token);
}

export function fetchAdminLeaseRequests(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiGet<AdminLeaseSummary[]>(`/api/admin/lease-requests${query}`, token);
}

export function fetchPublicAnnouncementsAdmin(token: string) {
  return apiGet<PublicAnnouncement[]>("/api/admin/public-announcements", token);
}

export function createPublicAnnouncement(
  token: string,
  payload: {
    message: string;
    icon: string;
    target_audience: "all" | "locataire" | "proprietaire";
    duration_hours: number;
    is_active: boolean;
  }
) {
  return apiPost<PublicAnnouncement>("/api/admin/public-announcements", token, payload);
}

export function updatePublicAnnouncement(
  token: string,
  announcementId: string,
  payload: {
    message?: string;
    icon?: string;
    target_audience?: "all" | "locataire" | "proprietaire";
    duration_hours?: number;
    is_active?: boolean;
  }
) {
  return apiPatch<PublicAnnouncement>(`/api/admin/public-announcements/${announcementId}`, token, payload);
}

export function deletePublicAnnouncement(token: string, announcementId: string) {
  return apiDelete(`/api/admin/public-announcements/${announcementId}`, token);
}

export function fetchAdminOwnerKyc(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiGet<AdminOwnerKycSummary[]>(`/api/admin/owner-kyc${query}`, token);
}

export function fetchAdminOwnerKycDetail(token: string, profileId: string) {
  return apiGet<AdminOwnerKycSummary>(`/api/admin/owner-kyc/${profileId}`, token);
}

export function reviewAdminOwnerKyc(
  token: string,
  profileId: string,
  decision: "approved" | "rejected",
  notes?: string
) {
  return apiPatch<AdminOwnerKycSummary>(`/api/admin/owner-kyc/${profileId}`, token, {
    decision,
    notes,
  });
}
