import { getApiBaseUrl } from "@/lib/api";

export type VisitAccessStatus = {
  has_access: boolean;
  payment_id?: string | null;
  payment_status?: string | null;
  checkout_status?: string | null;
  amount: number;
  currency: string;
  paid_at?: string | null;
  expires_at?: string | null;
};

export type VisitAccessCheckout = {
  id: string;
  property_id: string;
  amount: number;
  currency: string;
  checkout_status: string;
  payment_status: string;
  wave_checkout_session_id?: string | null;
  wave_launch_url: string;
  created_at: string;
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

export async function getVisitAccessStatus(token: string, propertyId: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/payments/visit-access/${propertyId}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleResponse<VisitAccessStatus>(response, "Impossible de vérifier votre réservation de visite.");
}

export async function createVisitAccessCheckout(
  token: string,
  propertyId: string,
  payload: {
    success_url?: string;
    error_url?: string;
  }
) {
  const response = await fetch(`${getApiBaseUrl()}/api/payments/visit-access/${propertyId}/checkout`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<VisitAccessCheckout>(response, "Impossible de créer le paiement Wave.");
}

export async function verifyVisitAccessPayment(token: string, paymentId: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/payments/visit-access/${paymentId}/verify`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return handleResponse<VisitAccessStatus>(response, "Impossible de vérifier le paiement Wave.");
}
