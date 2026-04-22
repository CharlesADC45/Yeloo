"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiImage,
  FiMapPin,
  FiUploadCloud,
  FiVideo,
} from "react-icons/fi";
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
  availabilityStatus: "available" | "reserved" | "rented";
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
  availabilityStatus: "available",
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

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
};

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
          availabilityStatus: data.availability_status ?? "available",
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
      availability_status: form.availabilityStatus,
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

  const fieldClass =
    "min-h-12 rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-[#174EA6] focus:ring-4 focus:ring-[#174EA6]/12";
  const labelClass =
    "flex flex-col gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500";
  const sectionClass = "rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-soft sm:p-6";
  const videoSource = videoPreview || form.videoUrl;
  const tourSource = tourPreview || form.tour360Url;
  const tourIsVideo = tourFile
    ? tourFile.type.startsWith("video/")
    : /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(form.tour360Url);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f4f7fb_48%,#f8fafc_100%)]">
      <TopBar />
      <OwnerSidebar />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <header className="rounded-[1.75rem] border border-neutral-200 bg-white px-5 py-5 shadow-soft sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <Link
                  href="/proprietaire/biens"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 transition hover:text-neutral-900"
                >
                  <FiArrowLeft />
                  Mes biens
                </Link>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
                  Modifier l'annonce
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">
                  Mettez à jour les informations, la localisation et les médias visibles par les locataires.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#EAF1FF] px-3 py-2 text-xs font-semibold text-[#123B8C]">
                  <FiCheckCircle />
                  {form.status === "published"
                    ? "Publié"
                    : form.status === "suspendu"
                      ? "Suspendu"
                      : "Brouillon"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                  {form.availabilityStatus === "reserved"
                    ? "Réservé"
                    : form.availabilityStatus === "rented"
                      ? "Loué"
                      : "Disponible"}
                </span>
                <Link
                  href="/proprietaire"
                  className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  Retour dashboard
                </Link>
              </div>
            </div>
          </header>

          {isLoading ? (
            <div className="rounded-[1.75rem] border border-neutral-200 bg-white px-5 py-8 text-sm text-neutral-600 shadow-soft">
              Chargement de l'annonce...
            </div>
          ) : (
            <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]" onSubmit={handleSubmit}>
              <div className="space-y-5">
                <section className={sectionClass}>
                  <div className="mb-5 flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF1FF] text-[#123B8C]">
                      <FiHome />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold text-neutral-950">Informations principales</h2>
                      <p className="mt-1 text-sm text-neutral-500">Titre, prix et caractéristiques du logement.</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={`${labelClass} sm:col-span-2`}>
                      Titre
                      <input required value={form.title} onChange={handleChange("title")} className={fieldClass} />
                    </label>

                    <label className={labelClass}>
                      Type de bien
                      <select value={form.propertyType} onChange={handleChange("propertyType")} className={fieldClass}>
                        <option value="studio">Studio</option>
                        <option value="appartement">Appartement</option>
                        <option value="maison">Maison</option>
                        <option value="villa">Villa</option>
                      </select>
                    </label>

                    <label className={labelClass}>
                      Statut
                      <select value={form.status} onChange={handleChange("status")} className={fieldClass}>
                        <option value="draft">Brouillon</option>
                        <option value="published">Publié</option>
                        <option value="suspendu">Suspendu</option>
                      </select>
                    </label>

                    <label className={labelClass}>
                      Disponibilité
                      <select value={form.availabilityStatus} onChange={handleChange("availabilityStatus")} className={fieldClass}>
                        <option value="available">Disponible</option>
                        <option value="reserved">Réservé</option>
                        <option value="rented">Loué</option>
                      </select>
                    </label>

                    <label className={labelClass}>
                      Prix (FCFA)
                      <input required type="number" value={form.price} onChange={handleChange("price")} className={fieldClass} />
                    </label>

                    <label className={labelClass}>
                      Période
                      <select value={form.pricePeriod} onChange={handleChange("pricePeriod")} className={fieldClass}>
                        <option value="jour">Jour</option>
                        <option value="semaine">Semaine</option>
                        <option value="mois">Mois</option>
                      </select>
                    </label>

                    <label className={labelClass}>
                      Surface (m2)
                      <input type="number" value={form.surfaceM2} onChange={handleChange("surfaceM2")} className={fieldClass} />
                    </label>

                    <label className={labelClass}>
                      Pièces
                      <input type="number" value={form.rooms} onChange={handleChange("rooms")} className={fieldClass} />
                    </label>

                    <label className={labelClass}>
                      Salles de bain
                      <input type="number" value={form.bathrooms} onChange={handleChange("bathrooms")} className={fieldClass} />
                    </label>

                    <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-semibold text-neutral-700">
                      <input
                        type="checkbox"
                        checked={form.isFurnished}
                        onChange={handleChange("isFurnished")}
                        className="h-4 w-4 rounded border-neutral-300 text-[#123B8C] focus:ring-[#174EA6]"
                      />
                      Meublé
                    </label>
                  </div>
                </section>

                <section className={sectionClass}>
                  <div className="mb-5 flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF1FF] text-[#123B8C]">
                      <FiMapPin />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold text-neutral-950">Localisation</h2>
                      <p className="mt-1 text-sm text-neutral-500">Adresse et coordonnées pour la carte.</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>
                      Ville
                      <input required value={form.city} onChange={handleChange("city")} className={fieldClass} />
                    </label>

                    <label className={`${labelClass} sm:col-span-2`}>
                      Adresse
                      <input value={form.address} onChange={handleChange("address")} className={fieldClass} />
                    </label>

                    <label className={`${labelClass} sm:col-span-2`}>
                      Coordonnées GPS
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={form.coordinates}
                          onChange={handleChange("coordinates")}
                          placeholder="5.296552, -3.966379"
                          className={`${fieldClass} flex-1`}
                        />
                        <button
                          type="button"
                          onClick={handleLocate}
                          className="min-h-12 rounded-2xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
                          disabled={isLocating}
                        >
                          {isLocating ? "Localisation..." : "Utiliser ma position"}
                        </button>
                      </div>
                    </label>
                  </div>
                </section>

                <section className={sectionClass}>
                  <div className="mb-5 flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF1FF] text-[#123B8C]">
                      <FiFileText />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold text-neutral-950">Description</h2>
                      <p className="mt-1 text-sm text-neutral-500">Ce que le locataire doit savoir avant de visiter.</p>
                    </div>
                  </div>

                  <label className={labelClass}>
                    Description
                    <textarea
                      rows={5}
                      value={form.description}
                      onChange={handleChange("description")}
                      className="min-h-36 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#174EA6] focus:ring-4 focus:ring-[#174EA6]/12"
                    />
                  </label>
                </section>

                <section className={sectionClass}>
                  <div className="mb-5 flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF1FF] text-[#123B8C]">
                      <FiImage />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold text-neutral-950">Photos</h2>
                      <p className="mt-1 text-sm text-neutral-500">Ajoutez des images à la galerie existante.</p>
                    </div>
                  </div>

                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center transition hover:border-[#174EA6] hover:bg-[#EAF1FF]/60">
                    <FiUploadCloud className="text-2xl text-[#123B8C]" />
                    <span className="mt-3 text-sm font-semibold text-neutral-900">
                      Choisir des photos
                    </span>
                    <span className="mt-1 text-xs text-neutral-500">
                      JPG, PNG, WEBP ou GIF. Les nouvelles photos seront ajoutées.
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handlePhotoChange}
                      className="sr-only"
                    />
                  </label>

                  {photoFiles.length > 0 && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {photoFiles.map((file) => (
                        <div key={`${file.name}-${file.size}`} className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600">
                          <p className="truncate font-semibold text-neutral-800">{file.name}</p>
                          <p className="mt-0.5">{formatFileSize(file.size)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className={sectionClass}>
                  <div className="mb-5 flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF1FF] text-[#123B8C]">
                      <FiVideo />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold text-neutral-950">Médias immersifs</h2>
                      <p className="mt-1 text-sm text-neutral-500">Vidéo classique et visite 360 pour renforcer la confiance.</p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <label className={labelClass}>
                      URL vidéo
                      <input value={form.videoUrl} onChange={handleChange("videoUrl")} placeholder="https://..." className={fieldClass} />
                    </label>

                    <label className="flex cursor-pointer flex-col rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 transition hover:bg-white">
                      <span className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                        <FiUploadCloud className="text-[#123B8C]" />
                        Télécharger une vidéo
                      </span>
                      <span className="mt-1 text-xs text-neutral-500">MP4, WEBM, OGG ou MOV. 150 Mo max.</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        capture="environment"
                        onChange={handleVideoChange}
                        className="sr-only"
                      />
                    </label>

                    {videoFile && <p className="text-xs text-neutral-500">{videoFile.name} · {formatFileSize(videoFile.size)}</p>}
                    {videoSource && (
                      <video className="h-56 w-full rounded-2xl bg-neutral-950 object-cover" src={videoSource} controls />
                    )}

                    <label className={labelClass}>
                      URL visite 360°
                      <input value={form.tour360Url} onChange={handleChange("tour360Url")} placeholder="https://..." className={fieldClass} />
                    </label>

                    <label className="flex cursor-pointer flex-col rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 transition hover:bg-white">
                      <span className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                        <FiUploadCloud className="text-[#123B8C]" />
                        Télécharger une visite 360
                      </span>
                      <span className="mt-1 text-xs text-neutral-500">Image ou vidéo. 50 Mo max.</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/ogg,video/quicktime"
                        capture="environment"
                        onChange={handleTourChange}
                        className="sr-only"
                      />
                    </label>

                    {tourFile && <p className="text-xs text-neutral-500">{tourFile.name} · {formatFileSize(tourFile.size)}</p>}
                    {tourSource && (
                      tourIsVideo ? (
                        <video className="h-56 w-full rounded-2xl bg-neutral-950 object-cover" src={tourSource} controls />
                      ) : (
                        <img src={tourSource} alt="Aperçu visite 360" className="h-56 w-full rounded-2xl object-cover" />
                      )
                    )}
                  </div>
                </section>
              </div>

              <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
                <section className="rounded-[1.75rem] border border-neutral-200 bg-white p-5 shadow-soft">
                  <h2 className="text-base font-semibold text-neutral-950">Résumé</h2>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="rounded-2xl bg-neutral-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">Annonce</p>
                      <p className="mt-2 line-clamp-2 font-semibold text-neutral-900">{form.title || "Titre non renseigné"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-[#EAF1FF] p-3 text-[#123B8C]">
                        <FiDollarSign />
                        <p className="mt-2 text-xs text-[#123B8C]/70">Prix</p>
                        <p className="font-semibold">{form.price || "0"} FCFA</p>
                      </div>
                      <div className="rounded-2xl bg-[#EAF1FF] p-3 text-[#123B8C]">
                        <FiMapPin />
                        <p className="mt-2 text-xs text-[#123B8C]/70">Ville</p>
                        <p className="font-semibold">{form.city || "-"}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">Médias ajoutés</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                          {photoFiles.length} photo{photoFiles.length > 1 ? "s" : ""}
                        </span>
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                          {videoFile || form.videoUrl ? "Vidéo prête" : "Pas de vidéo"}
                        </span>
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                          {tourFile || form.tour360Url ? "360 prêt" : "Pas de 360"}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-2xl border border-[#174EA6]/20 bg-[#EAF1FF] px-4 py-3 text-sm text-[#123B8C]">
                    {success}
                  </div>
                )}

                <div className="rounded-[1.75rem] border border-neutral-200 bg-white p-4 shadow-soft">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#123B8C] px-5 text-sm font-semibold text-white transition hover:bg-[#0B2E6D] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Envoi..." : "Enregistrer les modifications"}
                  </button>
                  <Link
                    href="/proprietaire/biens"
                    className="mt-2 flex min-h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold text-neutral-600 transition hover:bg-neutral-50"
                  >
                    Annuler
                  </Link>
                </div>
              </aside>
            </form>
          )}
        </motion.section>
      </main>
    </div>
  );
}
