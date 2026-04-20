"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FiCamera, FiFilePlus, FiImage, FiUploadCloud, FiVideo } from "react-icons/fi";
import { CelebrationModal } from "@/components/CelebrationModal";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { TopBar } from "@/components/TopBar";
import { getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";

type Step = {
  title: string;
  subtitle: string;
};

type FormState = {
  title: string;
  description: string;
  propertyType: string;
  price: string;
  pricePeriod: "jour" | "semaine" | "mois";
  depositMonths: string;
  advanceMonths: string;
  surfaceM2: string;
  rooms: string;
  bathrooms: string;
  address: string;
  city: string;
  coordinates: string;
  isFurnished: boolean;
};

type FieldErrorKey = keyof FormState | "photos" | "video" | "tour";
type SubmissionStepId = "validation" | "property" | "photos" | "media" | "finalization";
type SubmissionStepState = "pending" | "running" | "success" | "error";

type SubmissionStep = {
  id: SubmissionStepId;
  label: string;
  status: SubmissionStepState;
  detail?: string;
};

const STEPS: Step[] = [
  { title: "Informations", subtitle: "Texte & localisation" },
  { title: "Médias", subtitle: "Photos, vidéo, 360" },
  { title: "Récapitulatif", subtitle: "Vérifier avant envoi" },
];

const DEFAULT_FORM: FormState = {
  title: "",
  description: "",
  propertyType: "appartement",
  price: "",
  pricePeriod: "mois",
  depositMonths: "",
  advanceMonths: "",
  surfaceM2: "",
  rooms: "",
  bathrooms: "",
  address: "",
  city: "",
  coordinates: "",
  isFurnished: false,
};

const MAX_VIDEO_BYTES = 150 * 1024 * 1024;
const MAX_TOUR_BYTES = 50 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
const SUBMISSION_STEPS: SubmissionStep[] = [
  { id: "validation", label: "Vérification locale", status: "pending" },
  { id: "property", label: "Création annonce", status: "pending" },
  { id: "photos", label: "Upload des photos", status: "pending" },
  { id: "media", label: "Upload des médias", status: "pending" },
  { id: "finalization", label: "Soumission du dossier", status: "pending" },
];

const PROPERTY_DRAFT_KEY = "yeloo-property-draft-v1";

const getFreshSubmissionSteps = () =>
  SUBMISSION_STEPS.map((step) => ({ ...step }));

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

const isSupportedImage = (file: File) =>
  SUPPORTED_IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp|gif)$/i.test(file.name);

const isSupportedVideo = (file: File) =>
  SUPPORTED_VIDEO_TYPES.includes(file.type) || /\.(mp4|webm|ogg|mov)$/i.test(file.name);

const unsupportedFileMessage =
  "Document non supporté. Utilisez JPG, PNG, WEBP, GIF pour les photos, ou MP4, WEBM, MOV pour les vidéos.";

const normalizeFetchError = (error: unknown, fallback: string) => {
  const raw = error instanceof Error ? error.message : fallback;
  if (!raw) return fallback;
  if (raw.includes("Failed to fetch") || raw.includes("NetworkError")) {
    return "Impossible de contacter l'API. Vérifiez que le backend tourne.";
  }
  const normalized = raw.replace(/mini0/gi, "MinIO");
  if (/minio non configur(e|é)/i.test(normalized)) {
    return "MinIO non configuré.";
  }
  return normalized;
};

export default function NouveauBienPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [tourFile, setTourFile] = useState<File | null>(null);
  const [tourPreview, setTourPreview] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedTourUrl, setUploadedTourUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FieldErrorKey, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saved" | "restored" | "unavailable">(
    "idle"
  );
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [isPhotoOptionsOpen, setIsPhotoOptionsOpen] = useState(false);
  const [isVideoOptionsOpen, setIsVideoOptionsOpen] = useState(false);
  const [isTourOptionsOpen, setIsTourOptionsOpen] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "running" | "error" | "success"
  >("idle");
  const [submissionSteps, setSubmissionSteps] = useState<SubmissionStep[]>(
    getFreshSubmissionSteps
  );
  const [isLocating, setIsLocating] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const pushOwnerPost = useNotificationStore((state) => state.pushOwnerPost);
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement | null>(null);
  const tourInputRef = useRef<HTMLInputElement | null>(null);
  const cameraTourInputRef = useRef<HTMLInputElement | null>(null);
  const isOwnerRole = user?.role === "proprietaire" || user?.role === "admin";
  const isVerifiedOwner = isOwnerRole && Boolean(user?.is_verified);

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
    try {
      const rawDraft = window.localStorage.getItem(PROPERTY_DRAFT_KEY);
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft) as Partial<FormState>;
        setForm((current) => ({ ...current, ...parsed }));
        setDraftStatus("restored");
      }
    } catch {
      setDraftStatus("unavailable");
    } finally {
      setIsDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isDraftLoaded || success) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(PROPERTY_DRAFT_KEY, JSON.stringify(form));
        setDraftStatus("saved");
      } catch {
        setDraftStatus("unavailable");
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [form, isDraftLoaded, success]);

  useEffect(() => {
    if (!shouldRedirect) return;
    const timer = window.setTimeout(() => {
      router.push("/proprietaire");
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [shouldRedirect, router]);

  useEffect(() => {
    if (photoFiles.length === 0) {
      setPhotoPreviews([]);
      return;
    }
    const previews = photoFiles.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoFiles]);

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

  const updateField = <Key extends keyof FormState>(field: Key, value: FormState[Key]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handlePhotosChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    const invalid = files.find((file) => !isSupportedImage(file));
    if (invalid) {
      setPhotoFiles([]);
      event.target.value = "";
      setErrors((prev) => ({ ...prev, photos: unsupportedFileMessage }));
      return;
    }
    setPhotoFiles(files);
    if (errors.photos) {
      setErrors((prev) => ({ ...prev, photos: undefined }));
    }
  };

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setUploadedVideoUrl(null);
    if (!file) {
      setVideoFile(null);
      return;
    }
    if (!isSupportedVideo(file)) {
      setVideoFile(null);
      event.target.value = "";
      setErrors((prev) => ({ ...prev, video: unsupportedFileMessage }));
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setErrors((prev) => ({ ...prev, video: "Vidéo trop lourde (150MB max)." }));
      return;
    }
    setErrors((prev) => ({ ...prev, video: undefined }));
    setVideoFile(file);
  };

  const handleTourChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setUploadedTourUrl(null);
    if (!file) {
      setTourFile(null);
      return;
    }
    const isValid = isSupportedImage(file) || isSupportedVideo(file);
    if (!isValid) {
      setTourFile(null);
      event.target.value = "";
      setErrors((prev) => ({ ...prev, tour: unsupportedFileMessage }));
      return;
    }
    if (file.size > MAX_TOUR_BYTES) {
      setErrors((prev) => ({ ...prev, tour: "Fichier 360 trop lourd (50MB max)." }));
      return;
    }
    setErrors((prev) => ({ ...prev, tour: undefined }));
    setTourFile(file);
  };

  const validateStep = (index: number) => {
    const nextErrors: Partial<Record<FieldErrorKey, string>> = {};
    if (index === 0) {
      if (!form.title.trim()) nextErrors.title = "Champ requis";
      if (!form.city.trim()) nextErrors.city = "Champ requis";
      const priceValue = Number(form.price);
      if (!form.price.trim() || Number.isNaN(priceValue) || priceValue <= 0) {
        nextErrors.price = "Prix invalide";
      }
      const depositValue = Number(form.depositMonths);
      if (!form.depositMonths.trim() || Number.isNaN(depositValue) || depositValue < 1) {
        nextErrors.depositMonths = "Caution invalide";
      }
      const advanceValue = Number(form.advanceMonths);
      if (!form.advanceMonths.trim() || Number.isNaN(advanceValue) || advanceValue < 1) {
        nextErrors.advanceMonths = "Avance invalide";
      }
      if (form.coordinates.trim()) {
        const coords = parseCoordinates(form.coordinates);
        if (!coords) {
          nextErrors.coordinates = "Coordonnées invalides";
        }
      }
    }
    if (index === 1 && photoFiles.length === 0) {
      nextErrors.photos = "Ajoutez au moins une photo";
    }
    if (index === 1 && videoFile) {
      if (!isSupportedVideo(videoFile)) {
        nextErrors.video = "Fichier vidéo invalide.";
      } else if (videoFile.size > MAX_VIDEO_BYTES) {
        nextErrors.video = "Vidéo trop lourde (150MB max).";
      }
    }
    if (index === 1 && tourFile) {
      const isValid = isSupportedImage(tourFile) || isSupportedVideo(tourFile);
      if (!isValid) {
        nextErrors.tour = "Fichier 360 invalide.";
      } else if (tourFile.size > MAX_TOUR_BYTES) {
        nextErrors.tour = "Fichier 360 trop lourd (50MB max).";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setErrors((prev) => ({
        ...prev,
        coordinates: "La géolocalisation n'est pas disponible.",
      }));
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        updateField("coordinates", `${lat}, ${lng}`);
        setErrors((prev) => ({ ...prev, coordinates: undefined }));
        setIsLocating(false);
      },
      () => {
        setErrors((prev) => ({
          ...prev,
          coordinates: "Impossible de récupérer la position GPS.",
        }));
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const updateSubmissionStep = (
    id: SubmissionStepId,
    status: SubmissionStepState,
    detail?: string
  ) => {
    setSubmissionSteps((current) =>
      current.map((step) =>
        step.id === id ? { ...step, status, detail } : step
      )
    );
  };

  const closeSubmissionModal = () => {
    if (isSubmitting) return;
    setSubmissionStatus("idle");
    setSubmissionSteps(getFreshSubmissionSteps());
  };

  const submitProperty = async () => {
    if (!token) {
      setSubmitError("Connectez-vous pour publier.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSuccess(null);
    setShouldRedirect(false);
    setSubmissionStatus("running");
    setSubmissionSteps(getFreshSubmissionSteps());

    let activeStep: SubmissionStepId = "validation";
    let propertyId: string | null = null;
    let priceValue: number | null = null;
    let latitudeValue: number | null = null;
    let longitudeValue: number | null = null;

    const runStep = async (id: SubmissionStepId, task: () => Promise<void>) => {
      activeStep = id;
      updateSubmissionStep(id, "running");
      await task();
      updateSubmissionStep(id, "success");
    };

    try {
      await runStep("validation", async () => {
        priceValue = parseLocaleNumber(form.price);
        if (!form.title.trim() || !form.city.trim() || !priceValue || priceValue <= 0) {
          throw new Error("Titre, ville et prix sont obligatoires.");
        }
        if (photoFiles.length === 0) {
          throw new Error("Ajoutez au moins une photo avant de soumettre.");
        }
        const coords = form.coordinates.trim() ? parseCoordinates(form.coordinates) : null;
        if (form.coordinates.trim() && !coords) {
          throw new Error("Coordonnées invalides. Format attendu: latitude, longitude.");
        }
        latitudeValue = coords?.lat ?? null;
        longitudeValue = coords?.lng ?? null;
        if (latitudeValue !== null && (latitudeValue < -90 || latitudeValue > 90)) {
          throw new Error("Latitude hors limite (-90 à 90).");
        }
        if (longitudeValue !== null && (longitudeValue < -180 || longitudeValue > 180)) {
          throw new Error("Longitude hors limite (-180 à 180).");
        }
      });

      await runStep("property", async () => {
        const payload = {
          title: form.title.trim(),
          description: form.description.trim() || null,
          property_type: form.propertyType,
          price: priceValue,
          price_period: form.pricePeriod,
          deposit_months: Number(form.depositMonths),
          advance_months: Number(form.advanceMonths),
          surface_m2: form.surfaceM2 ? parseLocaleNumber(form.surfaceM2) : null,
          rooms: form.rooms ? parseLocaleNumber(form.rooms) : null,
          bathrooms: form.bathrooms ? parseLocaleNumber(form.bathrooms) : null,
          address: form.address.trim() || null,
          city: form.city.trim(),
          neighborhood: null,
          latitude: latitudeValue,
          longitude: longitudeValue,
          is_furnished: form.isFurnished,
        };

        const response = await fetch(`${getApiBaseUrl()}/api/properties`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const detail = body?.detail || body?.message || `Erreur API (${response.status})`;
          throw new Error(`Création annonce: ${detail}`);
        }

        const created = await response.json();
        propertyId = created.id as string;
      });

      await runStep("photos", async () => {
        if (!propertyId) throw new Error("Annonce créée sans identifiant.");
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
          throw new Error(`Upload photos: ${message}`);
        }
      });

      await runStep("media", async () => {
        if (!propertyId) throw new Error("Annonce créée sans identifiant.");
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
            throw new Error(`Upload médias: ${message}`);
          }
          const mediaData = await mediaResponse.json();
          setUploadedVideoUrl(mediaData.video_url ?? null);
          setUploadedTourUrl(mediaData.tour_360_url ?? null);
        }
      });

      await runStep("finalization", async () => {
        if (!propertyId) throw new Error("Annonce créée sans identifiant.");
        pushOwnerPost({
          propertyId,
          title: form.title.trim(),
          city: form.city.trim(),
          ownerId: user?.id ?? null,
          ownerName: user?.full_name ?? null,
          imageUrl: photoPreviews[0] ?? null,
        });
      });

      setSubmissionStatus("success");
      setSuccess("Annonce créée. Préparation de votre espace...");
      window.localStorage.removeItem(PROPERTY_DRAFT_KEY);
      setShouldRedirect(true);
    } catch (err) {
      const message = normalizeFetchError(err, "Publication impossible.");
      setSubmissionStatus("error");
      updateSubmissionStep(activeStep, "error", message);
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = async () => {
    if (!validateStep(stepIndex)) return;
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
      return;
    }
    await submitProperty();
  };

  const goPrev = () => {
    setErrors({});
    setSubmitError(null);
    setSuccess(null);
    setShouldRedirect(false);
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleCelebrationClose = () => {
    setShouldRedirect(false);
    router.push("/proprietaire");
  };

  const isLastStep = stepIndex === STEPS.length - 1;
  const videoDisplayUrl = uploadedVideoUrl ?? videoPreview;
  const tourDisplayUrl = uploadedTourUrl ?? tourPreview;
  const isTourVideo = Boolean(
    tourDisplayUrl &&
      (tourFile?.type.startsWith("video/") ||
        /\.(mp4|webm|ogg|mov)$/i.test(tourDisplayUrl))
  );
  const formattedPrice = form.price
    ? new Intl.NumberFormat("fr-FR").format(Number(form.price))
    : "-";

  if (isAuthenticated && user && (!isOwnerRole || !isVerifiedOwner)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <OwnerSidebar />
      <main className="mx-auto max-w-3xl px-3 pb-36 pt-20 sm:px-4 sm:pt-24 lg:ml-72 lg:max-w-5xl lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-auto max-w-4xl bg-white px-1 py-3 sm:rounded-3xl sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 sm:px-0">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Publier un nouveau bien
              </h1>
              <p className="mt-1 text-xs text-neutral-600">
                Suivez les étapes pour créer votre annonce.
              </p>
              <p
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                  draftStatus === "unavailable"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {draftStatus === "unavailable"
                  ? "Sauvegarde locale indisponible"
                  : draftStatus === "restored"
                    ? "Brouillon restauré automatiquement"
                    : "Brouillon sauvegardé automatiquement"}
              </p>
            </div>
            <Link
              href="/proprietaire"
              className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700"
            >
              Retour
            </Link>
          </div>

          <div className="mt-5 min-w-0 overflow-visible sm:rounded-3xl sm:border sm:border-neutral-200 sm:p-5">
            <div className="relative">
              <div className="flex items-start justify-between gap-1 text-center sm:gap-2">
                {STEPS.map((step, index) => {
                  const isActive = index === stepIndex;
                  const isDone = index < stepIndex;
                  const isFirst = index === 0;
                  const isLast = index === STEPS.length - 1;
                  return (
                    <div key={step.title} className="relative flex flex-1 flex-col items-center px-0.5 sm:px-2">
                      {!isFirst && (
                        <>
                          <span className="absolute left-0 right-1/2 top-4 h-0.5 bg-neutral-200 sm:top-5" />
                          <motion.span
                            className="absolute left-0 right-1/2 top-4 h-0.5 origin-right bg-blue-600 sm:top-5"
                            initial={false}
                            animate={{ scaleX: index <= stepIndex ? 1 : 0 }}
                            transition={{ duration: 0.28, ease: "easeInOut" }}
                          />
                        </>
                      )}
                      {!isLast && (
                        <>
                          <span className="absolute left-1/2 right-0 top-4 h-0.5 bg-neutral-200 sm:top-5" />
                          <motion.span
                            className="absolute left-1/2 right-0 top-4 h-0.5 origin-left bg-blue-600 sm:top-5"
                            initial={false}
                            animate={{ scaleX: index < stepIndex ? 1 : 0 }}
                            transition={{ duration: 0.28, ease: "easeInOut" }}
                          />
                        </>
                      )}
                      <motion.div
                        initial={false}
                        animate={{
                          scale: isActive ? 1.08 : 1,
                          backgroundColor: isDone ? "#2563eb" : "#ffffff",
                          borderColor: isDone || isActive ? "#2563eb" : "#d4d4d8",
                          color: isDone
                            ? "#ffffff"
                            : isActive
                              ? "#2563eb"
                              : "#a3a3a3",
                          boxShadow: isActive
                            ? "0 0 0 6px rgba(37, 99, 235, 0.10)"
                            : "0 0 0 0 rgba(37, 99, 235, 0)",
                        }}
                        transition={{ type: "spring", stiffness: 280, damping: 22 }}
                        className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-semibold sm:h-10 sm:w-10 sm:text-xs"
                      >
                        <motion.span
                          key={`${step.title}-${isDone}-${isActive}`}
                          initial={{ opacity: 0.3, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.18 }}
                        >
                          {isDone ? "\u2713" : index + 1}
                        </motion.span>
                      </motion.div>
                      <motion.div
                        className="mt-3"
                        initial={false}
                        animate={{
                          opacity: isActive || isDone ? 1 : 0.7,
                          y: isActive ? 0 : 2,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <p
                          className={`text-xs font-semibold ${
                            isActive || isDone ? "text-neutral-900" : "text-neutral-400"
                          }`}
                        >
                          {step.title}
                        </p>
                        <p className="hidden text-[11px] text-neutral-400 min-[390px]:block">{step.subtitle}</p>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 min-w-0 overflow-visible sm:rounded-2xl sm:bg-neutral-50 sm:p-5">
              {stepIndex === 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-neutral-600 sm:col-span-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Titre
                    </span>
                    <input
                      value={form.title}
                      onChange={(event) => updateField("title", event.target.value)}
                      className={`h-12 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                        errors.title ? "border-red-300 ring-red-200" : "border-neutral-200"
                      }`}
                      aria-invalid={Boolean(errors.title)}
                    />
                    {errors.title && (
                      <span className="text-[11px] text-red-500">{errors.title}</span>
                    )}
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Type de bien
                    </span>
                    <select
                      value={form.propertyType}
                      onChange={(event) => updateField("propertyType", event.target.value)}
                      className="h-12 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70"
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
                      type="number"
                      value={form.price}
                      onChange={(event) => updateField("price", event.target.value)}
                      className={`h-12 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                        errors.price ? "border-red-300 ring-red-200" : "border-neutral-200"
                      }`}
                      aria-invalid={Boolean(errors.price)}
                    />
                    {errors.price && (
                      <span className="text-[11px] text-red-500">{errors.price}</span>
                    )}
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Période
                    </span>
                    <select
                      value={form.pricePeriod}
                      onChange={(event) =>
                        updateField("pricePeriod", event.target.value as FormState["pricePeriod"])
                      }
                       className="h-12 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70"
                    >
                      <option value="jour">Jour</option>
                      <option value="semaine">Semaine</option>
                      <option value="mois">Mois</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Caution (mois)
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={form.depositMonths}
                      onChange={(event) => updateField("depositMonths", event.target.value)}
                      className={`h-12 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                        errors.depositMonths ? "border-red-300 ring-red-200" : "border-neutral-200"
                      }`}
                    />
                    {errors.depositMonths && (
                      <span className="text-[11px] text-red-500">{errors.depositMonths}</span>
                    )}
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Avance (mois)
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={form.advanceMonths}
                      onChange={(event) => updateField("advanceMonths", event.target.value)}
                      className={`h-12 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                        errors.advanceMonths ? "border-red-300 ring-red-200" : "border-neutral-200"
                      }`}
                    />
                    {errors.advanceMonths && (
                      <span className="text-[11px] text-red-500">{errors.advanceMonths}</span>
                    )}
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Ville
                    </span>
                    <input
                      value={form.city}
                      onChange={(event) => updateField("city", event.target.value)}
                      className={`h-12 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                        errors.city ? "border-red-300 ring-red-200" : "border-neutral-200"
                      }`}
                      aria-invalid={Boolean(errors.city)}
                    />
                    {errors.city && (
                      <span className="text-[11px] text-red-500">{errors.city}</span>
                    )}
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-neutral-600 sm:col-span-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Adresse
                    </span>
                    <input
                      value={form.address}
                      onChange={(event) => updateField("address", event.target.value)}
                      className="h-12 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Surface (m2)
                    </span>
                    <input
                      type="number"
                      value={form.surfaceM2}
                      onChange={(event) => updateField("surfaceM2", event.target.value)}
                      className="h-12 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Pièces
                    </span>
                    <input
                      type="number"
                      value={form.rooms}
                      onChange={(event) => updateField("rooms", event.target.value)}
                      className="h-12 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-neutral-600">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Salles de bain
                    </span>
                    <input
                      type="number"
                      value={form.bathrooms}
                      onChange={(event) => updateField("bathrooms", event.target.value)}
                      className="h-12 rounded-2xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-neutral-600 sm:col-span-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                      Coordonnées GPS (lat, lng)
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={form.coordinates}
                        onChange={(event) => updateField("coordinates", event.target.value)}
                        placeholder="5.296552, -3.966379"
                         className={`h-12 flex-1 rounded-2xl border bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 ${
                          errors.coordinates
                            ? "border-red-300 ring-red-200"
                            : "border-neutral-200"
                        }`}
                        aria-invalid={Boolean(errors.coordinates)}
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
                    {errors.coordinates && (
                      <span className="text-[11px] text-red-500">{errors.coordinates}</span>
                    )}
                  </label>

                  <label className="flex items-center gap-2 text-xs text-neutral-600 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.isFurnished}
                      onChange={(event) => updateField("isFurnished", event.target.checked)}
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
                      onChange={(event) => updateField("description", event.target.value)}
                      className="rounded-2xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70"
                    />
                  </label>
                </div>
              )}

              {stepIndex === 1 && (
                <div className="space-y-5">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.985 }}
                      onClick={() => setIsPhotoOptionsOpen((value) => !value)}
                      className="flex min-h-20 items-center justify-between gap-4 rounded-[1.35rem] border border-neutral-200 bg-white px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <span className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-50 text-neutral-500">
                          <FiUploadCloud />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-neutral-950">
                            Ajouter un fichier
                          </span>
                          <span className="mt-0.5 block text-xs text-neutral-500">
                            Photo JPG, PNG ou WEBP
                          </span>
                        </span>
                      </span>
                      <span className="rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white">
                        {isPhotoOptionsOpen ? "Fermer" : "Ouvrir"}
                      </span>
                    </motion.button>

                    <AnimatePresence initial={false}>
                      {isPhotoOptionsOpen && (
                        <>
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.22 }}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => cameraPhotoInputRef.current?.click()}
                            className="flex min-h-20 items-center gap-4 rounded-[1.35rem] bg-white px-4 py-3 text-left transition hover:bg-neutral-100"
                          >
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                              <FiCamera />
                            </span>
                            <span className="text-sm font-semibold text-neutral-950">Prendre une photo</span>
                          </motion.button>

                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.24 }}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => photoInputRef.current?.click()}
                            className="flex min-h-20 items-center gap-4 rounded-[1.35rem] bg-white px-4 py-3 text-left transition hover:bg-neutral-100 lg:col-span-2"
                          >
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-50 text-neutral-500">
                              <FiImage />
                            </span>
                            <span>
                              <span className="block text-sm font-semibold text-neutral-950">
                                Uploader depuis le téléphone
                              </span>
                              <span className="mt-0.5 block text-xs text-neutral-500">
                                Ajoutez plusieurs images claires et lumineuses.
                              </span>
                            </span>
                          </motion.button>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <input
                    ref={photoInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handlePhotosChange}
                    className="hidden"
                  />
                  <input
                    ref={cameraPhotoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    capture="environment"
                    onChange={handlePhotosChange}
                    className="hidden"
                  />

                  <div className="rounded-[1.35rem] border border-neutral-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">Photos du bien</p>
                        <p className="text-xs text-neutral-500">
                          {photoFiles.length
                            ? `${photoFiles.length} photo(s) sélectionnée(s)`
                            : "Aucune photo sélectionnée"}
                        </p>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] text-neutral-500">
                        Obligatoire
                      </span>
                    </div>
                    {photoFiles.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {photoFiles.map((file) => (
                          <span
                            key={`${file.name}-${file.size}`}
                            className="max-w-[180px] truncate rounded-full bg-neutral-100 px-3 py-1 text-[11px] text-neutral-600"
                          >
                            {file.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {photoPreviews.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {photoPreviews.slice(0, 3).map((src) => (
                          <img
                            key={src}
                            src={src}
                            alt="Aperçu photo"
                            className="h-24 w-full rounded-2xl object-cover"
                          />
                        ))}
                      </div>
                    )}
                    {errors.photos && (
                      <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-[11px] text-red-600">
                        {errors.photos}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[1.35rem] border border-neutral-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-50 text-neutral-500">
                            <FiVideo />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">Vidéo de visite</p>
                            <p className="text-xs text-neutral-500">MP4, WEBM ou MOV · 150MB max</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] text-neutral-500">
                          {videoFile ? "1 fichier" : "Optionnel"}
                        </span>
                      </div>
                      {videoFile && (
                        <p className="mt-3 text-[11px] text-neutral-600">{videoFile.name}</p>
                      )}
                      {videoDisplayUrl && (
                        <video
                          className="mt-4 h-28 w-full rounded-xl object-cover"
                          src={videoDisplayUrl}
                          controls
                        />
                      )}
                      {errors.video && (
                        <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-[11px] text-red-600">
                          {errors.video}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsVideoOptionsOpen((value) => !value)}
                        className="mt-4 min-h-11 rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white"
                      >
                        {isVideoOptionsOpen ? "Fermer" : "Ouvrir les options"}
                      </button>
                      <AnimatePresence initial={false}>
                        {isVideoOptionsOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.22 }}
                            className="mt-3 grid gap-2"
                          >
                            <button
                              type="button"
                              onClick={() => cameraVideoInputRef.current?.click()}
                              className="flex min-h-12 items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-2 text-left text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100"
                            >
                              <FiCamera className="text-blue-600" />
                              Prendre une vidéo
                            </button>
                            <button
                              type="button"
                              onClick={() => videoInputRef.current?.click()}
                              className="flex min-h-12 items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-2 text-left text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100"
                            >
                              <FiUploadCloud className="text-neutral-500" />
                              Uploader depuis le téléphone
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        onChange={handleVideoChange}
                        className="hidden"
                      />
                      <input
                        ref={cameraVideoInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        capture="environment"
                        onChange={handleVideoChange}
                        className="hidden"
                      />
                    </div>

                    <div className="rounded-[1.35rem] border border-neutral-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-50 text-neutral-500">
                            <FiFilePlus />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">Visite 360°</p>
                            <p className="text-xs text-neutral-500">Image panoramique ou vidéo courte</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] text-neutral-500">
                          {tourFile ? "1 fichier" : "Optionnel"}
                        </span>
                      </div>
                      {tourFile && (
                        <p className="mt-3 text-[11px] text-neutral-600">{tourFile.name}</p>
                      )}
                      {tourDisplayUrl ? (
                        isTourVideo ? (
                          <video
                            className="mt-4 h-28 w-full rounded-xl object-cover"
                            src={tourDisplayUrl}
                            controls
                          />
                        ) : (
                          <img
                            src={tourDisplayUrl}
                            alt="Aperçu visite 360"
                            className="mt-4 h-28 w-full rounded-xl object-cover"
                          />
                        )
                      ) : null}
                      {errors.tour && (
                        <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-[11px] text-red-600">
                          {errors.tour}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsTourOptionsOpen((value) => !value)}
                        className="mt-4 min-h-11 rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white"
                      >
                        {isTourOptionsOpen ? "Fermer" : "Ouvrir les options"}
                      </button>
                      <AnimatePresence initial={false}>
                        {isTourOptionsOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.22 }}
                            className="mt-3 grid gap-2"
                          >
                            <button
                              type="button"
                              onClick={() => cameraTourInputRef.current?.click()}
                              className="flex min-h-12 items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-2 text-left text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100"
                            >
                              <FiCamera className="text-blue-600" />
                              Capturer une vidéo 360°
                            </button>
                            <button
                              type="button"
                              onClick={() => tourInputRef.current?.click()}
                              className="flex min-h-12 items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-2 text-left text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100"
                            >
                              <FiFilePlus className="text-neutral-500" />
                              Uploader une visite 360°
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <input
                        ref={tourInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/ogg,video/quicktime"
                        onChange={handleTourChange}
                        className="hidden"
                      />
                      <input
                        ref={cameraTourInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/ogg,video/quicktime"
                        capture="environment"
                        onChange={handleTourChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {stepIndex === 2 && (
                <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Informations du bien
                    </h3>
                    <div className="mt-3 grid gap-3 text-sm text-neutral-600">
                      <div className="flex items-center justify-between">
                        <span>Type</span>
                        <span className="font-semibold text-neutral-900">
                          {form.propertyType}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Prix</span>
                        <span className="font-semibold text-neutral-900">
                          {formattedPrice} FCFA / {form.pricePeriod}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Caution</span>
                        <span className="font-semibold text-neutral-900">
                          {form.depositMonths || "-"} mois
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Avance</span>
                        <span className="font-semibold text-neutral-900">
                          {form.advanceMonths || "-"} mois
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Ville</span>
                        <span className="font-semibold text-neutral-900">{form.city || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Adresse</span>
                        <span className="font-semibold text-neutral-900">
                          {form.address || "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Coordonnées</span>
                        <span className="font-semibold text-neutral-900">
                          {form.coordinates || "-"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
                      {form.description.trim() || "Aucune description fournie."}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-neutral-900">Documents joints</h3>
                    <div className="mt-3 space-y-3 text-xs text-neutral-600">
                      <div className="flex items-center justify-between">
                        <span>Photos</span>
                        <span className="font-semibold text-neutral-900">
                          {photoFiles.length > 0
                            ? `${photoFiles.length} fichier(s)`
                            : "Non ajouté"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Vidéo</span>
                        <span className="font-semibold text-neutral-900">
                          {videoFile ? "Sélectionnée" : "Optionnelle"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Visite 360</span>
                        <span className="font-semibold text-neutral-900">
                          {tourFile ? "Sélectionnée" : "Optionnelle"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {submitError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {submitError}
              </div>
            )}
            <div className="sticky bottom-24 -mx-1 mt-6 flex items-center justify-between gap-3 border-t border-neutral-100 bg-white/96 px-1 py-3 backdrop-blur sm:static sm:mx-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-0">
              <button
                type="button"
                onClick={goPrev}
                className="min-h-11 rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-600 disabled:opacity-40"
                disabled={stepIndex === 0}
              >
                Précédent
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">
                  Étape {stepIndex + 1} / {STEPS.length}
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={isSubmitting}
                  className="min-h-11 rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLastStep ? (isSubmitting ? "Envoi..." : "Publier") : "Suivant"}
                </button>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
      {(submissionStatus === "running" || submissionStatus === "error") && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-5 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  submissionStatus === "error"
                    ? "bg-red-50 text-red-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {submissionStatus === "error" ? (
                  <span className="text-xl font-semibold">×</span>
                ) : (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold text-neutral-950">
                  {submissionStatus === "error" ? "Soumission échouée" : "Soumission en cours"}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {submissionStatus === "error"
                    ? "Une erreur est survenue. Vérifiez l'étape indiquée."
                    : "Nous finalisons votre annonce."}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {submissionSteps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center justify-between gap-3 rounded-full bg-neutral-50 px-4 py-3 text-sm"
                >
                  <span className="min-w-0 truncate text-neutral-600">{step.label}</span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      step.status === "success"
                        ? "bg-emerald-100 text-emerald-700"
                        : step.status === "error"
                          ? "bg-red-100 text-red-700"
                          : step.status === "running"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-white text-neutral-300"
                    }`}
                  >
                    {step.status === "success" && "?"}
                    {step.status === "error" && "×"}
                    {step.status === "running" && (
                      <span className="h-3 w-3 animate-spin rounded-full border border-blue-200 border-t-blue-700" />
                    )}
                    {step.status === "pending" && "-"}
                  </span>
                </div>
              ))}
            </div>

            {submissionStatus === "error" && (
              <button
                type="button"
                onClick={closeSubmissionModal}
                className="mt-5 w-full rounded-full border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700"
              >
                Fermer
              </button>
            )}
          </motion.div>
        </div>
      )}
      <CelebrationModal
        open={Boolean(success)}
        title="Annonce créée"
        message="Bravo, votre bien est enregistré. Vous pourrez le publier, le suivre et l'améliorer depuis votre espace propriétaire."
        actionLabel="Voir mon dashboard"
        onClose={handleCelebrationClose}
      />
    </div>
  );
}


