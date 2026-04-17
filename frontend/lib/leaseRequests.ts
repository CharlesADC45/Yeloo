"use client";

import { getApiBaseUrl } from "@/lib/api";

export type LeaseRequest = {
  id: string;
  property_id: string;
  owner_id: string;
  tenant_id: string;
  property_title: string;
  property_city: string;
  property_neighborhood?: string | null;
  property_address?: string | null;
  property_price: number;
  property_price_period: string;
  property_type: string;
  tenant_full_name: string;
  tenant_email: string;
  tenant_phone?: string | null;
  contract_text: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  submitted_at?: string | null;
  reviewed_at?: string | null;
};

const parseResponse = async (response: Response) => {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || `Erreur API (${response.status})`);
  }
  return payload;
};

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

export async function getLeaseRequestForProperty(propertyId: string, token: string) {
  const response = await fetch(
    `${getApiBaseUrl()}/api/lease-requests/by-property/${propertyId}`,
    { headers: authHeaders(token) }
  );
  return (await parseResponse(response)) as LeaseRequest;
}

export async function createLeaseRequestForProperty(propertyId: string, token: string) {
  const response = await fetch(
    `${getApiBaseUrl()}/api/lease-requests/by-property/${propertyId}`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({}),
    }
  );
  return (await parseResponse(response)) as LeaseRequest;
}

export async function getLeaseRequestById(leaseRequestId: string, token: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/lease-requests/${leaseRequestId}`, {
    headers: authHeaders(token),
  });
  return (await parseResponse(response)) as LeaseRequest;
}

export async function listOwnerLeaseRequests(token: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/lease-requests/owner`, {
    headers: authHeaders(token),
  });
  return (await parseResponse(response)) as LeaseRequest[];
}

export async function updateLeaseRequestStatus(
  leaseRequestId: string,
  status: "approved" | "rejected",
  token: string
) {
  const response = await fetch(
    `${getApiBaseUrl()}/api/lease-requests/${leaseRequestId}/status`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    }
  );
  return (await parseResponse(response)) as LeaseRequest;
}
