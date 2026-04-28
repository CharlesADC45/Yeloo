import { getApiBaseUrl } from "@/lib/api";

export type PublicAnnouncement = {
  id: string;
  message: string;
  icon: string;
  display_mode: "text" | "poster_auto" | "poster_manual";
  image_url?: string | null;
  link_url?: string | null;
  cta_label?: string | null;
  font_family?: string | null;
  text_color?: string | null;
  text_size?: string | null;
  text_position?: string | null;
  content_inset?: string | null;
  overlay_strength?: string | null;
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
