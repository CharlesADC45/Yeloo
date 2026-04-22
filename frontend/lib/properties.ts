import { getApiBaseUrl } from "@/lib/api";

export type PropertyFilters = {
  city: string;
  neighborhood: string;
  minPrice: string;
  maxPrice: string;
  propertyType: string;
};

export type Property = {
  id: string;
  title: string;
  description?: string;
  city: string;
  neighborhood: string;
  address?: string;
  price: number;
  pricePeriod: string;
  depositMonths?: number | null;
  advanceMonths?: number | null;
  surfaceM2?: number;
  rooms?: number;
  bathrooms?: number;
  isFurnished?: boolean;
  propertyType: string;
  isVerified: boolean;
  imageUrl: string;
  badgeLabel?: string;
  promoLabel?: string;
  promoUntil?: string;
  photoUrls?: string[];
  latitude?: number;
  longitude?: number;
  videoUrl?: string;
  tour360Url?: string;
  ownerIsVerified?: boolean;
};

export type ApiProperty = {
  id: string;
  title: string;
  description?: string | null;
  city: string;
  neighborhood?: string | null;
  address?: string | null;
  price: number | string;
  price_period?: string | null;
  deposit_months?: number | string | null;
  advance_months?: number | string | null;
  surface_m2?: number | string | null;
  rooms?: number | string | null;
  bathrooms?: number | string | null;
  is_furnished?: boolean | null;
  property_type?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  video_url?: string | null;
  tour_360_url?: string | null;
  is_verified_listing?: boolean | null;
  status?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  photo_urls?: string[] | null;
  owner_is_verified?: boolean | null;
  promo_label?: string | null;
  promo_until?: string | null;
};

const FALLBACK_IMAGES: Record<string, string> = {
  studio: "/property-fallback.svg",
  appartement: "/property-fallback.svg",
  maison: "/property-fallback.svg",
  villa: "/property-fallback.svg",
  default: "/property-fallback.svg",
};

const STATUS_BADGES: Record<string, string> = {
  published: "Disponible",
  draft: "Brouillon",
  suspendu: "Annonce suspendue",
};

const toNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const normalized = value.replace(/\s+/g, "").replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const resolveImageUrl = (value?: string | null) => {
  if (!value) return undefined;
  if (value.startsWith("http")) return value;
  return `${getApiBaseUrl()}${value}`;
};

export const mapApiProperty = (api: ApiProperty): Property => {
  const propertyType = (api.property_type || "appartement").toLowerCase();
  const photoUrls = Array.isArray(api.photo_urls)
    ? api.photo_urls
        .map((url) => resolveImageUrl(url))
        .filter((url): url is string => Boolean(url))
    : [];
  const imageUrl =
    resolveImageUrl(api.image_url) ||
    resolveImageUrl(api.imageUrl) ||
    photoUrls[0] ||
    FALLBACK_IMAGES[propertyType] ||
    FALLBACK_IMAGES.default;
  const status = (api.status || "").toLowerCase();
  const badgeLabel = api.is_verified_listing
    ? "Annonce verifiee"
    : STATUS_BADGES[status];
  const promoUntil = api.promo_until || undefined;
  const promoIsActive = Boolean(
    api.promo_label &&
      (!promoUntil || Number.isNaN(Date.parse(promoUntil)) || new Date(promoUntil).getTime() >= Date.now())
  );

  return {
    id: String(api.id),
    title: api.title || "Logement",
    description: api.description || "",
    city: api.city || "Abidjan",
    neighborhood: api.neighborhood || "",
    address: api.address || "",
    price: toNumber(api.price) ?? 0,
    pricePeriod: api.price_period || "mois",
    depositMonths: toNumber(api.deposit_months) ?? null,
    advanceMonths: toNumber(api.advance_months) ?? null,
    surfaceM2: toNumber(api.surface_m2),
    rooms: toNumber(api.rooms),
    bathrooms: toNumber(api.bathrooms),
    isFurnished: Boolean(api.is_furnished),
    propertyType,
    isVerified: Boolean(api.is_verified_listing),
    imageUrl,
    badgeLabel,
    promoLabel: promoIsActive ? api.promo_label || undefined : undefined,
    promoUntil,
    photoUrls,
    latitude: toNumber(api.latitude),
    longitude: toNumber(api.longitude),
    videoUrl: resolveImageUrl(api.video_url),
    tour360Url: resolveImageUrl(api.tour_360_url),
    ownerIsVerified: Boolean(api.owner_is_verified),
  };
};

export const applyPropertyFilters = (
  properties: Property[],
  filters: PropertyFilters
) => {
  return properties.filter((p) => {
    if (filters.city) {
      const query = filters.city.toLowerCase();
      const cityMatch = p.city.toLowerCase().includes(query);
      const neighborhoodMatch = p.neighborhood.toLowerCase().includes(query);
      if (!cityMatch && !neighborhoodMatch) {
        return false;
      }
    }
    if (
      filters.neighborhood &&
      !p.neighborhood.toLowerCase().includes(filters.neighborhood.toLowerCase())
    ) {
      return false;
    }
    if (filters.propertyType && p.propertyType !== filters.propertyType) {
      return false;
    }
    if (filters.minPrice && p.price < Number(filters.minPrice)) {
      return false;
    }
    if (filters.maxPrice && p.price > Number(filters.maxPrice)) {
      return false;
    }
    return true;
  });
};
