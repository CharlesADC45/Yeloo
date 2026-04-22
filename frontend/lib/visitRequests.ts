import { getApiBaseUrl } from "@/lib/api";

export type VisitRequestStatus = "pending" | "accepted" | "declined" | "rescheduled" | "cancelled";

export type VisitRequest = {
  id: string;
  property_id: string;
  owner_id: string;
  tenant_id: string;
  property_title: string;
  property_city: string;
  property_neighborhood?: string | null;
  tenant_full_name: string;
  tenant_email: string;
  tenant_phone?: string | null;
  preferred_at: string;
  proposed_at?: string | null;
  message?: string | null;
  owner_message?: string | null;
  status: VisitRequestStatus;
  created_at: string;
  updated_at: string;
  reviewed_at?: string | null;
};

async function handleResponse<T>(response: Response, fallback: string): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || fallback);
  }
  return payload as T;
}

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

export async function getVisitRequestForProperty(propertyId: string, token: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/visit-requests/by-property/${propertyId}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<VisitRequest>(response, "Impossible de charger la demande de visite.");
}

export async function createVisitRequestForProperty(
  propertyId: string,
  token: string,
  payload: {
    preferred_at: string;
    message?: string;
  }
) {
  const response = await fetch(`${getApiBaseUrl()}/api/visit-requests/by-property/${propertyId}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<VisitRequest>(response, "Impossible d'envoyer la demande de visite.");
}

export async function listOwnerVisitRequests(token: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/visit-requests/owner`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<VisitRequest[]>(response, "Impossible de charger les demandes de visite.");
}

export async function listMyVisitRequests(token: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/visit-requests/mine`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<VisitRequest[]>(response, "Impossible de charger vos demandes de visite.");
}

export async function updateVisitRequestStatus(
  visitRequestId: string,
  token: string,
  payload: {
    status: "accepted" | "declined" | "rescheduled";
    proposed_at?: string;
    owner_message?: string;
  }
) {
  const response = await fetch(`${getApiBaseUrl()}/api/visit-requests/${visitRequestId}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<VisitRequest>(response, "Impossible de mettre a jour la demande de visite.");
}
