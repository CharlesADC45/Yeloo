"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { TopBar } from "@/components/TopBar";
import { getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

type FormState = {
  title: string;
  description: string;
  propertyType: string;
  price: string;
  pricePeriod: "jour" | "semaine" | "mois";
  status: "draft" | "published" | "suspendu";
  surfaceM2: string;
  rooms: string;
  bathrooms: string;
  address: string;
  city: string;
  coordinates: string;
  isFurnished: boolean;
  videoUrl: string;
  tour360Url: string;
};

const DEFAULT_FORM: FormState = {
  title: "",
  description: "",
  propertyType: "appartement",
  price: "",
  pricePeriod: "mois",
  status: "draft",
  surfaceM2: "",
  rooms: "",
  bathrooms: "",
  address: "",
  city: "",
  coordinates: "",
  isFurnished: false,
  videoUrl: "",
  tour360Url: "",
};

const MAX_VIDEO_BYTES = 150 * 1024 * 1024;
const MAX_TOUR_BYTES = 50 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
const unsupportedFileMessage =
  "Document non supporté. Utilisez JPG, PNG, WEBP, GIF pour les photos, ou MP4, WEBM, MOV pour les vidéos.";

const isSupportedImage = (file: File) =>
  SUPPORTED_IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp|gif)$/i.test(file.name);

const isSupportedVideo = (file: File) =>
  SUPPORTED_VIDEO_TYPES.includes(file.type) || /\.(mp4|webm|ogg|mov)$/i.test(file.name);
const parseLocaleNumber = (value: string) => {
  const normalized = value.trim().replace(/\s+/g, "").replace(/,/g, ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
const parseCoordinates = (value: string) => {
  const matches = value.match(/-?\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length < 2) return null;
  const lat = parseLocaleNumber(matches[0]);
  const lng = parseLocaleNumber(matches[1]);
  if (lat === null || lng === null) return null;
  return { lat, lng };
};

export default function EditPropertyPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [tourFile, setTourFile] = useState<File | null>(null);
  const [tourPreview, setTourPreview] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const isOwnerRole = user?.role === "proprietaire" || user?.role === "admin";
  const isVerifiedOwner = isOwnerRole && Boolean(user?.is_verified);
  const params = useParams();
  const propertyId = Array.isArray(params?.propertyId)
    ? params.propertyId[0]
    : params?.propertyId;

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (!isOwnerRole) {
      router.replace("/");
      return;
    }
    if (!isVerifiedOwner) {
      router.replace("/proprietaire");
    }
  }, [isAuthenticated, isOwnerRole, isVerifiedOwner, router, user]);

  useEffect(() => {
    if (!shouldRedirect) return;
    const timer = window.setTimeout(() => {
      router.push("/proprietaire");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [shouldRedirect, router]);

  useEffect(() => {
    if (!videoFile) {
      setVideoPreview(null);
      return;
    }
    const preview = URL.createObjectURL(videoFile);
    setVideoPreview(preview);
    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [videoFile]);

  useEffect(() => {
    if (!tourFile) {
      setTourPreview(null);
      return;
    }
    const preview = URL.createObjectURL(tourFile);
    setTourPreview(preview);
    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [tourFile]);

  useEffect(() => {
    if (!propertyId) {
      setError("Identifiant manquant.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`${getApiBaseUrl()}/api/properties/${propertyId}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Annonce introuvable."
              : `Erreur API (${response.status})`
          );
        }
        return response.json();
      })
      .then((data) => {
        setForm({
          title: data.title ?? "",
          description: data.description ?? "",
          propertyType: data.property_type ?? "appartement",
          price: data.price ? String(data.price) : "",
          pricePeriod: data.price_period ?? "mois",
          status: data.status ?? "draft",
          surfaceM2: data.surface_m2 ? String(data.surface_m2) : "",
          rooms: data.rooms ? String(data.rooms) : "",
          bathrooms: data.bathrooms ? String(data.bathrooms) : "",
          address: data.address ?? "",
          city: data.city ?? "",
          coordinates:
            typeof data.latitude === "number" && typeof data.longitude === "number"
              ? `${data.latitude}, ${data.longitude}`
              : "",
          isFurnished: Boolean(data.is_furnished),
          videoUrl: data.video_url ?? "",
          tour360Url: data.tour_360_url ?? "",
        });
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setError(err.message || "Impossible de charger l'annonce.");
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [propertyId]);

  const handleChange =
    (field: keyof FormState) =>
    (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
      const value =
        event.target.type === "checkbox"
          ? (event.target as HTMLInputElement).checked
          : event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    const invalid = files.find((file) => !isSupportedImage(file));
    if (invalid) {
      setPhotoFiles([]);
      event.target.value = "";
      setError(unsupportedFileMessage);
      return;
    }
    setError(null);
    setPhotoFiles(files);
  };

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setVideoFile(null);
      return;
    }
    if (!isSupportedVideo(file)) {
      setVideoFile(null);
      event.target.value = "";
      setError(unsupportedFileMessage);
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("Vidéo trop lourde (150MB max).");
      return;
    }
    setError(null);
    setVideoFile(file);
  };

  const handleTourChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setTourFile(null);
      return;
    }
    const isValid = isSupportedImage(file) || isSupportedVideo(file);
    if (!isValid) {
      setTourFile(null);
      event.target.value = "";
      setError(unsupportedFileMessage);
      return;
    }
    if (file.size > MAX_TOUR_BYTES) {
      setError("Fichier 360 trop lourd (50MB max).");
      return;
    }
    setError(null);
    setTourFile(file);
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas disponible.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setForm((prev) => ({ ...prev, coordinates: `${lat}, ${lng}` }));
        setError(null);
        setIsLocating(false);
      },
      () => {
        setError("Impossible de récupérer la position GPS.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!propertyId) {
      setError("Identifiant manquant.");
      return;
    }
    if (!token) {
      setError("Connectez-vous pour modifier une annonce.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setShouldRedirect(false);

    const priceValue = parseLocaleNumber(form.price);
    const coords = form.coordinates ? parseCoordinates(form.coordinates) : null;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      property_type: form.propertyType,
      price: priceValue ?? 0,
      price_period: form.pricePeriod,
      status: form.status,
      surface_m2: form.surfaceM2 ? parseLocaleNumber(form.surfaceM2) : null,
      rooms: form.rooms ? parseLocaleNumber(form.rooms) : null,
      bathrooms: form.bathrooms ? parseLocaleNumber(form.bathrooms) : null,
      address: form.address.trim() || null,
      city: form.city.trim(),
      neighborhood: null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      is_furnished: form.isFurnished,
      video_url: form.videoUrl.trim() || null,
      tour_360_url: form.tour360Url.trim() || null,
    };

    if (!payload.title || !payload.city || !priceValue || priceValue <= 0) {
      setError("Titre, ville et prix sont obligatoires.");
      setIsSubmitting(false);
      return;
    }
    if (form.coordinates && !coords) {
      setError("Coordonnées invalides. Format attendu: latitude, longitude.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/properties/${propertyId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const detail =
          body?.detail || body?.message || `Erreur API (${response.status})`;
        throw new Error(detail);
      }

      if (photoFiles.length > 0) {
        const photoPayload = new FormData();
        photoFiles.forEach((file) => photoPayload.append("files", file));
        const photoResponse = await fetch(
          `${getApiBaseUrl()}/api/properties/${propertyId}/photos`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: photoPayload,
          }
        );
        if (!photoResponse.ok) {
          const detail = await photoResponse.json().catch(() => null);
          const message =
            detail?.detail ||
            detail?.message ||
            `Erreur upload (${photoResponse.status})`;
          throw new Error(message);
        }
      }

      if (videoFile || tourFile) {
        const mediaPayload = new FormData();
        if (videoFile) {
          mediaPayload.append("video", videoFile);
        }
        if (tourFile) {
          mediaPayload.append("tour_360", tourFile);
        }
        const mediaResponse = await fetch(
          `${getApiBaseUrl()}/api/properties/${propertyId}/media`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: mediaPayload,
          }
        );
        if (!mediaResponse.ok) {
          const detail = await mediaResponse.json().catch(() => null);
          const message =
            detail?.detail ||
            detail?.message ||
            `Erreur media (${mediaResponse.status})`;
          throw new Error(message);
        }
        const mediaData = await mediaResponse.json();
        setForm((prev) => ({
          ...prev,
          videoUrl: mediaData.video_url ?? prev.videoUrl,
          tour360Url: mediaData.tour_360_url ?? prev.tour360Url,
        }));
      }

      setSuccess("Annonce mise à jour. Redirection...");
      setShouldRedirect(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Modification impossible.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated && user && (!isOwnerRole || !isVerifiedOwner)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <OwnerSidebar />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl bg-white p-6 shadow-soft"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Modifier l'annonce</h1>
              <p className="mt-1 text-xs text-neutral-600">
                Mettez à jour les informations principales du bien.
              </p>
            </div>
            <Link
              href="/proprietaire"
              className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700"
            >
              Retour
            </Link>
          </div>

          {isLoading ? (
            <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-6 text-sm text-neutral-600">
              Chargement de l'annonce...
            </div>
          ) : (
            <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-1 text-xs text-neutral-600 sm:col-span-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Titre
                </span>
                <input
                  required
                  value={form.title}
                  onChange={handleChange("title")}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Type de bien
                </span>
                <select
                  value={form.propertyType}
                  onChange={handleChange("propertyType")}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                >
                  <option value="studio">Studio</option>
                  <option value="appartement">Appartement</option>
                  <option value="maison">Maison</option>
                  <option value="villa">Villa</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Prix (FCFA)
                </span>
                <input
                  required
                  type="number"
                  value={form.price}
                  onChange={handleChange("price")}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Période
                </span>
                <select
                  value={form.pricePeriod}
                  onChange={handleChange("pricePeriod")}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                >
                  <option value="jour">Jour</option>
                  <option value="semaine">Semaine</option>
                  <option value="mois">Mois</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Statut
                </span>
                <select
                  value={form.status}
                  onChange={handleChange("status")}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publie</option>
                  <option value="suspendu">Suspendu</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Ville
                </span>
                <input
                  required
                  value={form.city}
                  onChange={handleChange("city")}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600 sm:col-span-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Adresse
                </span>
                <input
                  value={form.address}
                  onChange={handleChange("address")}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Surface (m2)
                </span>
                <input
                  type="number"
                  value={form.surfaceM2}
                  onChange={handleChange("surfaceM2")}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Pièces
                </span>
                <input
                  type="number"
                  value={form.rooms}
                  onChange={handleChange("rooms")}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Salles de bain
                </span>
                <input
                  type="number"
                  value={form.bathrooms}
                  onChange={handleChange("bathrooms")}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600 sm:col-span-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Coordonnées GPS (lat, lng)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={form.coordinates}
                    onChange={handleChange("coordinates")}
                    placeholder="5.296552, -3.966379"
                    className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={handleLocate}
                    className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700"
                    disabled={isLocating}
                  >
                    {isLocating ? "Localisation..." : "Utiliser ma position"}
                  </button>
                </div>
              </label>

              <label className="flex items-center gap-2 text-xs text-neutral-600 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isFurnished}
                  onChange={handleChange("isFurnished")}
                  className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                Meuble
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600 sm:col-span-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Description
                </span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={handleChange("description")}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600 sm:col-span-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  URL visite 360°
                </span>
                <input
                  value={form.tour360Url}
                  onChange={handleChange("tour360Url")}
                  placeholder="https://..."
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600 sm:col-span-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  URL vidéo
                </span>
                <input
                  value={form.videoUrl}
                  onChange={handleChange("videoUrl")}
                  placeholder="https://..."
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600 sm:col-span-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Ajouter des photos
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoChange}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
                <span className="text-[11px] text-neutral-400">
                  Les nouvelles photos seront ajoutees a la galerie existante.
                </span>
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600 sm:col-span-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Télécharger une vidéo (optionnel)
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime"
                  capture="environment"
                  onChange={handleVideoChange}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
                {videoFile && (
                  <span className="text-[11px] text-neutral-400">{videoFile.name}</span>
                )}
                {videoPreview ? (
                  <video
                    className="mt-3 h-32 w-full rounded-xl object-cover"
                    src={videoPreview}
                    controls
                  />
                ) : form.videoUrl ? (
                  <video
                    className="mt-3 h-32 w-full rounded-xl object-cover"
                    src={form.videoUrl}
                    controls
                  />
                ) : null}
              </label>

              <label className="flex flex-col gap-1 text-xs text-neutral-600 sm:col-span-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                  Télécharger une visite 360 (optionnel)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/ogg,video/quicktime"
                  capture="environment"
                  onChange={handleTourChange}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                />
                {tourFile && (
                  <span className="text-[11px] text-neutral-400">{tourFile.name}</span>
                )}
                {tourPreview && tourFile ? (
                  tourFile.type.startsWith("video/") ? (
                    <video
                    className="mt-3 h-32 w-full rounded-xl object-cover"
                      src={tourPreview}
                      controls
                    />
                  ) : (
                    <img
                      src={tourPreview}
                      alt="Aperçu 360"
                      className="mt-3 h-32 w-full rounded-xl object-cover"
                    />
                  )
                ) : form.tour360Url ? (
                  /\.(mp4|webm|ogg|mov)$/i.test(form.tour360Url) ? (
                    <video
                      className="mt-3 h-32 w-full rounded-xl object-cover"
                      src={form.tour360Url}
                      controls
                    />
                  ) : (
                    <img
                      src={form.tour360Url}
                      alt="Aperçu 360"
                      className="mt-3 h-32 w-full rounded-xl object-cover"
                    />
                  )
                ) : null}
              </label>

              {error && (
                <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {success}
                </div>
              )}

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Envoi..." : "Enregistrer"}
                </button>
              </div>
            </form>
          )}
        </motion.section>
      </main>
    </div>
  );
}
