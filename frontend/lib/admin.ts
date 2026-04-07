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

export type AdminPropertySummary = {
  id: string;
  title: string;
  city: string;
  neighborhood?: string | null;
  price: number;
  price_period: string;
  deposit_months?: number | null;
  status: string;
  owner_name?: string | null;
  created_at: string;
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

export function fetchAdminUsers(token: string, role?: string) {
  const query = role ? `?role=${encodeURIComponent(role)}` : "";
  return apiGet<AdminUserSummary[]>(`/api/admin/users${query}`, token);
}

export function updateAdminUserSuspension(token: string, userId: string, isSuspended: boolean) {
  return apiPatch<AdminUserSummary>(`/api/admin/users/${userId}/suspension`, token, {
    is_suspended: isSuspended,
  });
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

export function fetchAdminLeaseRequests(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiGet<AdminLeaseSummary[]>(`/api/admin/lease-requests${query}`, token);
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
