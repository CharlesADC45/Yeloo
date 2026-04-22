import { getApiBaseUrl } from "@/lib/api";

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

export async function fetchActivePublicAnnouncements(audience = "all", signal?: AbortSignal) {
  const params = new URLSearchParams({ audience });
  const response = await fetch(`${getApiBaseUrl()}/api/public/announcements?${params}`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Impossible de charger les annonces publiques.");
  }
  const payload = (await response.json()) as PublicAnnouncement[];
  return Array.isArray(payload) ? payload : [];
}
