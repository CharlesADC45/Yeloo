"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import gsap from "gsap";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiHeart,
  FiHome,
  FiLayers,
  FiMapPin,
  FiPhone,
  FiPlay,
  FiShare2,
  FiShield,
  FiTarget,
  FiTool,
} from "react-icons/fi";
import { BottomNav } from "@/components/BottomNav";
import { ImmersiveTourViewer } from "@/components/ImmersiveTourViewer";
import { DetailPageSkeleton } from "@/components/Skeleton";
import { TopBar } from "@/components/TopBar";
import { fetchPublicModules } from "@/lib/modules";
import { useProperty } from "@/hooks/useProperties";
import { ensureConversation } from "@/lib/messages";
import {
  createVisitRequestForProperty,
  getVisitRequestForProperty,
  type VisitRequest,
} from "@/lib/visitRequests";
import { useAuthStore } from "@/stores/authStore";
import { useFavoritesStore } from "@/stores/favoritesStore";

type Props = {
  id: string;
};

type MapProps = {
  latitude?: number;
  longitude?: number;
  title: string;
  imageUrl?: string;
  isApproximate?: boolean;
};

const ABIDJAN_CENTER = { latitude: 5.3599517, longitude: -4.0082563 };
const VISIT_TIME_SLOTS = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "18:30"];

function formatVisitDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getVisitStatusLabel(status?: VisitRequest["status"]) {
  switch (status) {
    case "accepted":
      return "Visite acceptée";
    case "declined":
      return "Visite refusée";
    case "rescheduled":
      return "Nouvelle date proposée";
    case "cancelled":
      return "Annulée";
    default:
      return "En attente";
  }
}

function toDateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function buildVisitDateOptions() {
  const date = new Date();
  if (date.getHours() >= 18) {
    date.setDate(date.getDate() + 1);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(date);
    next.setDate(date.getDate() + index);
    const value = toDateKey(next);
    const displayDate = dateFromKey(value);
    return {
      value,
      weekday: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(displayDate),
      day: new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(displayDate),
      month: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(displayDate),
    };
  });
}

function buildVisitDateTime(day: string, time: string) {
  return `${day}T${time}`;
}

function getListingCommentDraftKey(propertyId: string, userId?: string | null) {
  return `yeloo:listing-comment:${propertyId}:${userId || "guest"}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildDetailLocationIcon(imageUrl?: string) {
  return `
    <div class="imc-user-location imc-user-location--detail">
      <span class="imc-user-location__halo"></span>
      <span class="imc-user-location__pin">
        <span class="imc-user-location__dot"></span>
      </span>
      <span class="imc-user-location__stem"></span>
    </div>
  `;
}

function PropertyMap({ latitude, longitude, title, imageUrl, isApproximate = false }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const streetLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const satelliteLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);

  useEffect(() => {
    if (typeof latitude !== "number" || typeof longitude !== "number") return;
    let isMounted = true;

    const initMap = async () => {
      if (!containerRef.current) return;
      const leaflet = leafletRef.current ?? (await import("leaflet"));
      if (!isMounted) return;
      leafletRef.current = leaflet;

      if (!mapRef.current) {
        mapRef.current = leaflet
          .map(containerRef.current, { zoomControl: true, attributionControl: false })
          .setView([latitude, longitude], 13);

        streetLayerRef.current = leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
          })
          .addTo(mapRef.current);

        satelliteLayerRef.current = leaflet.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            maxZoom: 19,
          }
        );
      } else {
        mapRef.current.setView([latitude, longitude], 13);
      }

      requestAnimationFrame(() => {
        mapRef.current?.invalidateSize();
      });
      const refreshMapSize = () => {
        mapRef.current?.invalidateSize();
      };
      window.setTimeout(refreshMapSize, 100);
      window.setTimeout(refreshMapSize, 260);

      if (markerRef.current) {
        markerRef.current.remove();
      }

      markerRef.current = leaflet
        .marker([latitude, longitude], {
          icon: leaflet.divIcon({
            className: "imc-marker",
            html: buildDetailLocationIcon(imageUrl),
            iconSize: [44, 56],
            iconAnchor: [22, 46],
          }),
          interactive: true,
        })
        .addTo(mapRef.current);
      markerRef.current.bindTooltip(
        `<div class="imc-hover-card imc-hover-card--compact">
          <div class="imc-hover-card__header">
            <p class="imc-hover-card__title">${escapeHtml(title)}${isApproximate ? " · zone approximative" : ""}</p>
            <span class="imc-hover-card__close">&times;</span>
          </div>
        </div>`,
        {
          direction: "top",
          offset: leaflet.point(0, -18),
          opacity: 1,
          className: "imc-hover-tooltip",
        }
      );

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined" && containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          mapRef.current?.invalidateSize();
        });
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        resizeObserver?.disconnect();
      };
    };

    let cleanup: (() => void) | undefined;
    void initMap().then((teardown) => {
      cleanup = teardown;
    });

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [latitude, longitude, title, imageUrl, isApproximate]);

  useEffect(() => {
    const map = mapRef.current;
    const streetLayer = streetLayerRef.current;
    const satelliteLayer = satelliteLayerRef.current;
    if (!map || !streetLayer || !satelliteLayer) return;

    if (isSatellite) {
      if (map.hasLayer(streetLayer)) map.removeLayer(streetLayer);
      if (!map.hasLayer(satelliteLayer)) satelliteLayer.addTo(map);
      return;
    }

    if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
    if (!map.hasLayer(streetLayer)) streetLayer.addTo(map);
  }, [isSatellite]);

  return (
    <div className="relative overflow-hidden rounded-[1.6rem] border border-neutral-200 bg-neutral-100">
      <div
        ref={containerRef}
        className="yeloo-detail-map relative block h-64 min-h-64 w-full overflow-hidden sm:h-72 sm:min-h-72"
      />
      <button
        type="button"
        onClick={() => setIsSatellite((value) => !value)}
        className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-800 shadow-[0_14px_34px_rgba(15,23,42,0.18)]"
        aria-label={isSatellite ? "Afficher le plan" : "Afficher en mode satellite"}
        title={isSatellite ? "Plan" : "Satellite"}
      >
        <FiLayers className="text-lg" />
      </button>
      <button
        type="button"
        onClick={() => mapRef.current?.setView([latitude as number, longitude as number], 15)}
        className="absolute right-4 top-[4rem] z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-800 shadow-[0_14px_34px_rgba(15,23,42,0.18)]"
        aria-label="Recentrer sur la position"
        title="Position"
      >
        <FiTarget className="text-lg" />
      </button>
    </div>
  );
  }

export function LogementClient({ id }: Props) {
  const params = useParams<{ id?: string | string[] }>();
  const resolvedId = useMemo(() => {
    if (id) return id;
    const paramId = params?.id;
    return Array.isArray(paramId) ? paramId[0] : paramId;
  }, [id, params]);
  const { property, isLoading, error } = useProperty(resolvedId);
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const detailRootRef = useRef<HTMLDivElement | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [isChatEnabled, setIsChatEnabled] = useState(true);
  const [isVisitEnabled, setIsVisitEnabled] = useState(true);
  const [visitRequest, setVisitRequest] = useState<VisitRequest | null>(null);
  const [visitDate, setVisitDate] = useState("");
  const [visitMessage, setVisitMessage] = useState("");
  const [visitError, setVisitError] = useState<string | null>(null);
  const [isSendingVisit, setIsSendingVisit] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSaved, setCommentSaved] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const gallery = useMemo(() => {
    if (!property) return [];
    if (property.photoUrls?.length) return property.photoUrls;
    return [property.imageUrl];
  }, [property]);
  const [activeSlide, setActiveSlide] = useState(0);
  const totalSlides = gallery.length || 1;
  const isFavorite = resolvedId ? favoriteIds.includes(resolvedId) : false;
  const locationLabel = [property?.neighborhood, property?.city].filter(Boolean).join(", ");
  const parsedLatitude =
    typeof property?.latitude === "number"
      ? property.latitude
      : property?.latitude != null
        ? Number(property.latitude)
        : undefined;
  const parsedLongitude =
    typeof property?.longitude === "number"
      ? property.longitude
      : property?.longitude != null
        ? Number(property.longitude)
        : undefined;
  const hasExactLocation =
    Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);
  const mapLatitude = hasExactLocation ? parsedLatitude : ABIDJAN_CENTER.latitude;
  const mapLongitude = hasExactLocation ? parsedLongitude : ABIDJAN_CENTER.longitude;

    const videoImage = gallery[2] ?? gallery[0];
  const tourUrl = property?.tour360Url;
  const videoUrl = property?.videoUrl;
  const isOwnerViewer = user?.role === "proprietaire" || user?.role === "admin";
  const visitDateOptions = useMemo(() => buildVisitDateOptions(), []);
  const selectedVisitDay = visitDate.slice(0, 10);
  const selectedVisitTime = visitDate.slice(11, 16);
  const ownerName = property?.ownerName || "Hôte Yeloo";
  const ownerLabel = "Propriétaire Yeloo";
  const ownerInitials = ownerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "Y";
  const ownerProfileImageUrl = property?.ownerProfileImageUrl;
  const pricePeriodLabel = property?.pricePeriod || "mois";
  const formatPrice = (value: number) => value.toLocaleString("en-US");
  const descriptionText =
    property?.description ||
    "Cette annonce n'a pas encore de description détaillée. Utilisez le flow de demande pour échanger avec le propriétaire et confirmer les derniers détails.";
  const paymentStats = property
    ? [
        {
          label: "Caution",
          value: property.depositMonths ? `${property.depositMonths} mois` : "Non renseignée",
        },
        {
          label: "Avance",
          value: property.advanceMonths ? `${property.advanceMonths} mois` : "Non renseignée",
        },
        { label: "Paiement", value: `par ${property.pricePeriod || "mois"}` },
      ]
    : [];
  const spaceStats = property
    ? [
        { label: "Pièces", value: property.rooms ? `${property.rooms}` : "Non renseigné" },
        { label: "Bains", value: property.bathrooms ? `${property.bathrooms}` : "Non renseigné" },
        {
          label: "Surface",
          value: property.surfaceM2 ? `${property.surfaceM2} m²` : "Non renseignée",
        },
      ]
    : [];
  const featureItems = property
    ? [
        {
          icon: FiHome,
          label: "Type de logement",
          value: property.propertyType || "Logement",
        },
        {
          icon: FiCheckCircle,
          label: "Meublé",
          value: property.isFurnished ? "Oui" : "Non",
        },
        {
          icon: FiMapPin,
          label: "Quartier",
          value: property.neighborhood || "Non renseigné",
        },
        {
          icon: FiShield,
          label: "Disponibilité",
          value: property.availabilityLabel,
        },
      ]
    : [];
  const knowItems = [
    {
      icon: FiClock,
      title: "Conditions d'annulation",
      lines: [
        "Confirmez les modalités avec le propriétaire avant toute avance.",
        "Gardez vos échanges dans Yeloo pour conserver une trace claire.",
      ],
    },
    {
      icon: FiTool,
      title: "Règlement intérieur",
      lines: [
        "Heure d'arrivée, départ et nombre d'occupants à confirmer.",
        "Les règles précises sont validées avant la décision finale.",
      ],
    },
    {
      icon: FiShield,
      title: "Sécurité et logement",
      lines: [
        property?.isVerified
          ? "Annonce vérifiée par la plateforme."
          : "Annonce en cours de vérification.",
        property?.ownerIsVerified
          ? "Profil propriétaire vérifié."
          : "Profil propriétaire à vérifier avant engagement.",
      ],
    },
  ];

  const handleOpenChat = async () => {
    if (!resolvedId) return;
    if (!isAuthenticated || !token) {
      router.push(`/connexion?next=/logements/${resolvedId}`);
      return;
    }
    setIsOpeningChat(true);
    setChatError(null);
    try {
      const conversation = await ensureConversation(token, resolvedId);
      router.push(`/messages/${conversation.id}`);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Impossible d'ouvrir la conversation.");
    } finally {
      setIsOpeningChat(false);
    }
  };

  const handleSelectVisitDay = (day: string) => {
    setVisitError(null);
    setVisitDate(buildVisitDateTime(day, selectedVisitTime || VISIT_TIME_SLOTS[0]));
  };

  const handleSelectVisitTime = (time: string) => {
    setVisitError(null);
    setVisitDate(
      buildVisitDateTime(selectedVisitDay || visitDateOptions[0]?.value || toDateKey(new Date()), time)
    );
  };

  const handleCreateVisitRequest = async () => {
    if (!resolvedId) return;
    if (!isAuthenticated || !token) {
      router.push(`/connexion?next=/logements/${resolvedId}`);
      return;
    }
    if (!visitDate) {
      setVisitError("Choisissez une date et une heure pour la visite.");
      return;
    }

    setIsSendingVisit(true);
    setVisitError(null);
    try {
      const preferredAt = new Date(visitDate).toISOString();
      const request = await createVisitRequestForProperty(resolvedId, token, {
        preferred_at: preferredAt,
        message: visitMessage.trim() || undefined,
      });
      setVisitRequest(request);
      setVisitMessage("");
    } catch (err) {
      setVisitError(err instanceof Error ? err.message : "Demande de visite impossible.");
    } finally {
      setIsSendingVisit(false);
    }
  };

  const handleSaveComment = () => {
    if (!resolvedId) return;
    try {
      window.localStorage.setItem(getListingCommentDraftKey(resolvedId, user?.id), commentDraft.trim());
      setCommentSaved(true);
    } catch {
      setCommentSaved(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadModules = async () => {
      try {
        const modules = await fetchPublicModules();
        if (!active) return;
        const chatModule = modules.find((item) => item.key === "listing_chat");
        const visitModule = modules.find((item) => item.key === "visit_requests");
        setIsChatEnabled(chatModule ? chatModule.is_enabled : true);
        setIsVisitEnabled(visitModule ? visitModule.is_enabled : true);
      } catch {
        if (active) {
          setIsChatEnabled(true);
          setIsVisitEnabled(true);
        }
      }
    };

    void loadModules();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!resolvedId || !token || isOwnerViewer) {
      setVisitRequest(null);
      return;
    }
    let active = true;
    getVisitRequestForProperty(resolvedId, token)
      .then((request) => {
        if (active) setVisitRequest(request);
      })
      .catch(() => {
        if (active) setVisitRequest(null);
      });
    return () => {
      active = false;
    };
  }, [isOwnerViewer, resolvedId, token]);

  useEffect(() => {
    if (!resolvedId || typeof window === "undefined") return;
    try {
      setCommentDraft(
        window.localStorage.getItem(getListingCommentDraftKey(resolvedId, user?.id)) || ""
      );
      setCommentSaved(false);
    } catch {
      setCommentDraft("");
    }
  }, [resolvedId, user?.id]);

  useEffect(() => {
    setActiveSlide(0);
    sliderRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    setIsDescriptionExpanded(false);
  }, [property?.id]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    let frame: number | null = null;

    const onScroll = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const index = Math.round(slider.scrollLeft / slider.clientWidth);
        setActiveSlide(Math.max(0, Math.min(index, totalSlides - 1)));
      });
    };

    slider.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      slider.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [totalSlides]);

  useEffect(() => {
    if (isLoading || !property) return;

    const cleanupFns: Array<() => void> = [];
    const context = gsap.context(() => {
      const revealItems = gsap.utils.toArray<HTMLElement>("[data-detail-reveal]");
      gsap.fromTo(
        revealItems,
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.08,
          ease: "power3.out",
          clearProps: "transform",
        }
      );

    }, detailRootRef);

    return () => {
      cleanupFns.forEach((cleanup) => cleanup());
      context.revert();
    };
  }, [isLoading, property]);

  const renderOwnerActions = () => (
    <div className="space-y-3">
      {!isOwnerViewer && isChatEnabled && (
        <button
          type="button"
          onClick={() => void handleOpenChat()}
          disabled={isOpeningChat || property?.availabilityStatus === "rented"}
          className="inline-flex w-full items-center justify-center rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-70"
        >
          {property?.availabilityStatus === "rented"
            ? "Logement déjà loué"
            : isOpeningChat
              ? "Ouverture..."
              : "Contacter le propriétaire"}
        </button>
      )}
      {!isAuthenticated && property && (
        <Link
          href={`/connexion?next=/logements/${property.id}`}
          className="inline-flex w-full items-center justify-center rounded-full border border-[#1854e2] bg-[#1854e2] px-5 py-3 text-sm font-semibold text-white transition hover:border-blue-700 hover:bg-blue-700"
        >
          Se connecter pour continuer
        </Link>
      )}
      <button
        type="button"
        className="inline-flex w-full items-center justify-center rounded-full border border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
      >
        <FiPhone className="mr-2" />
        Assistance Yeloo+
      </button>
      {chatError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {chatError}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-32 pt-28 sm:px-8 lg:px-12">
          <DetailPageSkeleton />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!property || error) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto max-w-3xl px-4 pb-32 pt-28 sm:px-8">
          <div className="rounded-[2rem] bg-white p-6 shadow-soft">
            <p className="text-sm text-neutral-700">
              {error || "Ce logement n'existe pas ou n'est plus disponible."}
            </p>
            <Link href="/" className="mt-4 inline-flex text-sm font-semibold text-blue-600">
              Retour à la recherche
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div ref={detailRootRef} className="min-h-screen overflow-x-hidden bg-transparent">
      <TopBar />
      <main className="mx-auto w-full max-w-[1450px] overflow-x-hidden px-4 pb-32 pt-20 sm:px-8 lg:px-12">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          <div
            className="fixed inset-x-0 top-[5rem] z-30 mx-auto flex w-full max-w-[1450px] flex-wrap items-start justify-between gap-4 border-b border-neutral-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-8 lg:px-12"
          >
            <div className="min-w-0 flex-1 space-y-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-soft"
              >
                <FiChevronLeft />
                Retour
              </button>
              <div>
                <h1 className="max-w-full break-words text-2xl font-semibold tracking-tight text-neutral-900 sm:text-[2.2rem]">
                  {property.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <FiMapPin className="text-sm" />
                    {locationLabel || property.city}
                  </span>
                  {property.promoLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-700 px-3 py-1 font-semibold text-white">
                      {property.promoLabel}
                    </span>
                  )}
                  {property.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                      <FiCheckCircle className="text-sm" />
                      Annonce vérifiée
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-soft"
                aria-label="Partager"
              >
                <FiShare2 />
              </button>
              <button
                type="button"
                onClick={() => resolvedId && toggleFavorite(resolvedId)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-soft"
                aria-label="Ajouter aux favoris"
              >
                <FiHeart className={isFavorite ? "fill-blue-600 text-blue-600" : ""} />
              </button>
            </div>
          </div>
          <div aria-hidden="true" className="h-[9.75rem] sm:h-[8.75rem]" />

          <div
            data-detail-reveal="true"
            className="relative overflow-hidden border border-neutral-200 bg-neutral-100"
          >
            <div
              ref={sliderRef}
              className="hide-scrollbar flex h-[300px] w-full snap-x snap-mandatory overflow-x-auto scroll-smooth sm:h-[420px] lg:h-[560px]"
            >
              {gallery.map((image, index) => (
                <div key={`${image}-${index}`} className="h-full min-w-full snap-center">
                  <img
                    src={image}
                    alt={`${property.title} ${index + 1}`}
                    onError={(event) => {
                      event.currentTarget.src = "/property-fallback.svg";
                    }}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="absolute bottom-5 right-5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
              {activeSlide + 1}/{totalSlides}
            </div>
            {property.promoLabel && (
              <div className="absolute left-5 top-5 rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-soft">
                {property.promoLabel}
              </div>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_380px]">
            <div className="space-y-6">
              <section data-detail-reveal="true" className="bg-white py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Prix et aperçu
                </p>
                <div className="mt-3 flex min-w-0 flex-col gap-5 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-2xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-3xl">
                      {formatPrice(property.price)} FCFA
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">par {pricePeriodLabel}</p>
                  </div>
                  <div className="w-full min-w-0 space-y-5 sm:w-[min(100%,36rem)]">
                    <div>
                      <p className="mb-3 text-sm font-semibold text-neutral-900">
                        Modalités
                      </p>
                      <div className="hide-scrollbar flex w-full max-w-[calc(100vw-2rem)] gap-4 overflow-x-auto pb-1 sm:max-w-full">
                        {paymentStats.map((item) => (
                          <div
                            key={item.label}
                            className="h-[132px] w-[142px] shrink-0 rounded-[1.25rem] border border-neutral-200 bg-white p-3"
                          >
                            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-50 text-neutral-700">
                              <FiCreditCard />
                            </div>
                            <p className="text-[15px] font-semibold leading-tight text-neutral-900">{item.label}</p>
                            <p className="mt-1 text-sm text-neutral-500">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-3 text-sm font-semibold text-neutral-900">
                        Espaces
                      </p>
                      <div className="hide-scrollbar flex w-full max-w-[calc(100vw-2rem)] gap-4 overflow-x-auto pb-1 sm:max-w-full">
                        {spaceStats.map((item) => (
                          <div
                            key={item.label}
                            className="h-[132px] w-[142px] shrink-0 rounded-[1.25rem] border border-neutral-200 bg-white p-3"
                          >
                            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-50 text-neutral-700">
                              <FiHome />
                            </div>
                            <p className="text-[15px] font-semibold leading-tight text-neutral-900">{item.label}</p>
                            <p className="mt-1 text-sm text-neutral-500">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

               <section
                 data-detail-reveal="true"
                 className="border-b border-neutral-200 bg-white py-6"
               >
                <div className="flex items-center gap-2">
                  <FiFileText className="text-blue-600" />
                  <h2 className="text-xl font-semibold text-neutral-900">Description</h2>
                </div>
                <p
                  className={`mt-4 max-w-3xl text-[15px] leading-8 text-neutral-700 ${
                    isDescriptionExpanded
                      ? ""
                      : "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]"
                  }`}
                >
                  {descriptionText}
                </p>
                {!isDescriptionExpanded && descriptionText.length > 180 && (
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(true)}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700"
                  >
                    Lire la suite
                    <FiChevronRight className="text-base" />
                  </button>
                )}
              </section>

               <section
                 data-detail-reveal="true"
                 className="border-b border-neutral-200 bg-white py-6"
               >
                <h2 className="text-xl font-semibold text-neutral-900">
                  Ce que propose ce logement
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {featureItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-4">
                        <Icon className="text-xl text-neutral-700" />
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">{item.label}</p>
                          <p className="mt-0.5 text-sm text-neutral-500">{item.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

               <section
                 data-detail-reveal="true"
                 className="border-t border-neutral-200 bg-white py-8"
               >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Propriétaire
                </p>
                <div className="mt-5 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="py-3">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          {ownerProfileImageUrl ? (
                            <img
                              src={ownerProfileImageUrl}
                              alt={ownerName}
                              className="h-16 w-16 rounded-sm object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center bg-neutral-950 text-2xl font-semibold text-white">
                              {ownerInitials}
                            </div>
                          )}
                          {property.ownerIsVerified && (
                            <span className="absolute -bottom-2 -right-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 px-2 py-1 text-[10px] font-semibold text-neutral-950 shadow-[0_10px_25px_rgba(245,158,11,0.35)]">
                              <FiShield className="text-[11px]" />
                              Premium
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-neutral-950">{ownerName}</p>
                          <p className="mt-1 text-base font-semibold text-neutral-700">{ownerLabel}</p>
                        <p className="mt-1 text-sm text-neutral-500">
                          Hôte sur Yeloo
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 divide-x divide-neutral-200 border-t border-neutral-200 pt-4 text-center">
                      <div>
                        <p className="text-lg font-semibold text-neutral-950">
                          {property.ownerIsVerified ? "Oui" : "En cours"}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-500">
                          Vérifié
                        </p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-neutral-950">1</p>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-500">
                          Annonce
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-y border-neutral-200 py-5">
                    {renderOwnerActions()}
                  </div>
                </div>
              </section>

               <section
                 data-detail-reveal="true"
                 className="border-t border-neutral-200 bg-white py-6"
               >
                <h2 className="text-xl font-semibold text-neutral-900">
                  Voici où se trouve le logement
                </h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Adresse: {property.address || "Adresse communiquée après contact"}
                </p>
                <div className="mt-4 space-y-4">
                  <PropertyMap
                    latitude={mapLatitude}
                    longitude={mapLongitude}
                    title={property.title}
                    imageUrl={gallery[0]}
                    isApproximate={!hasExactLocation}
                  />
                  {!hasExactLocation && (
                    <p className="border-b border-neutral-200 pb-4 text-xs leading-6 text-neutral-500">
                      Position approximative: les coordonnées exactes n'ont pas encore été ajoutées par le propriétaire.
                    </p>
                  )}
                </div>
              </section>

               <section data-detail-reveal="true" className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_0.95fr]">
                <div className="border-t border-neutral-200 bg-white py-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-neutral-900 sm:text-lg">Tour virtuel 360</h2>
                  </div>
                  <div className="relative mt-4 h-[28rem] overflow-hidden rounded-[1.75rem] bg-neutral-100 sm:h-[34rem]">
                    <ImmersiveTourViewer
                      tourUrl={tourUrl}
                      fallbackImageUrl="/property-fallback.svg"
                      title={property.title}
                      location={locationLabel || property.city}
                      priceLabel={`${formatPrice(property.price)} FCFA / ${pricePeriodLabel}`}
                      className="h-full w-full"
                      points={[
                        {
                          id: "view-front",
                          title: "Vue 1",
                          description: "Angle principal de la photo 360.",
                          position: { yaw: -0.2, pitch: 0.02 },
                        },
                        {
                          id: "view-left",
                          title: "Vue 2",
                          description: "Angle lateral dans la meme photo 360.",
                          position: { yaw: 1.05, pitch: -0.03 },
                        },
                        {
                          id: "view-right",
                          title: "Vue 3",
                          description: "Autre point de vue dans le panorama.",
                          position: { yaw: 2.12, pitch: 0.04 },
                        },
                        {
                          id: "view-back",
                          title: "Vue 4",
                          description: "Angle oppose pour continuer l'exploration.",
                          position: { yaw: -2.18, pitch: -0.05 },
                        },
                      ]}
                    />
                  </div>
                </div>
                <div className="border-t border-neutral-200 bg-white py-5">
                  <h2 className="text-lg font-semibold text-neutral-900">Video</h2>
                  <div className="relative mt-4 h-52 overflow-hidden rounded-[1.4rem] bg-neutral-100 sm:h-60">
                    {videoUrl ? (
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        poster={videoImage}
                        className="h-full w-full object-cover"
                        src={videoUrl}
                      />
                    ) : (
                      <>
                        {videoImage && (
                          <img
                            src={videoImage}
                            alt={`Video ${property.title}`}
                            onError={(event) => {
                              event.currentTarget.src = "/property-fallback.svg";
                            }}
                            className="h-full w-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-neutral-700 shadow-soft">
                            <FiPlay />
                            Video de presentation bientot disponible
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-5 xl:self-start">
              {!isOwnerViewer && isVisitEnabled && property.availabilityStatus !== "rented" && (
                <div
                  data-detail-reveal="true"
                  className="rounded-[1.8rem] border border-blue-100 bg-blue-50/60 p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-blue-700">
                      <FiClock />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                        Visite
                      </p>
                      <h2 className="text-lg font-semibold text-neutral-950">
                        Demander une visite
                      </h2>
                    </div>
                  </div>

                  {visitRequest ? (
                    <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-white p-4 text-sm">
                      <p className="font-semibold text-blue-700">
                        {getVisitStatusLabel(visitRequest.status)}
                      </p>
                      <p className="mt-2 text-neutral-700">
                        Date souhaitée: {formatVisitDate(visitRequest.preferred_at)}
                      </p>
                      {visitRequest.proposed_at && (
                        <p className="mt-1 text-neutral-700">
                          Nouvelle date: {formatVisitDate(visitRequest.proposed_at)}
                        </p>
                      )}
                      {visitRequest.owner_message && (
                        <p className="mt-3 rounded-2xl bg-blue-50 px-3 py-2 text-xs leading-5 text-neutral-600">
                          {visitRequest.owner_message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-5 space-y-4">
                      <div className="rounded-[1.4rem] border border-blue-100 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3 px-1">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                              Choisir une date
                            </p>
                          </div>
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                            7 jours
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {visitDateOptions.map((day) => {
                            const isSelected = selectedVisitDay === day.value;
                            return (
                              <button
                                key={day.value}
                                type="button"
                                onClick={() => handleSelectVisitDay(day.value)}
                                className={`min-h-[4.8rem] rounded-2xl border px-2 py-2 text-center transition ${
                                  isSelected
                                    ? "border-blue-700 bg-blue-700 text-white shadow-[0_16px_34px_rgba(29,78,216,0.22)]"
                                    : "border-neutral-200 bg-white text-neutral-700 hover:border-blue-200 hover:bg-blue-50"
                                }`}
                              >
                                <span className="block text-[11px] font-semibold capitalize">
                                  {day.weekday.replace(".", "")}
                                </span>
                                <span className="mt-1 block text-xl font-semibold">{day.day}</span>
                                <span className="block text-[11px] font-medium capitalize opacity-80">
                                  {day.month.replace(".", "")}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-5">
                          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Créneau préféré
                          </p>
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {VISIT_TIME_SLOTS.map((time) => {
                              const isSelected = selectedVisitTime === time;
                              return (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => handleSelectVisitTime(time)}
                                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                                    isSelected
                                      ? "border-blue-700 bg-blue-700 text-white"
                                      : "border-neutral-200 bg-white text-neutral-700 hover:border-blue-200 hover:bg-blue-50"
                                  }`}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Message optionnel
                        <textarea
                          value={visitMessage}
                          onChange={(event) => setVisitMessage(event.target.value)}
                          rows={3}
                          maxLength={500}
                          placeholder="Ex: Je suis disponible ce jour-là en fin de matinée."
                          className="mt-2 w-full resize-none rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-blue-500"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void handleCreateVisitRequest()}
                        disabled={isSendingVisit}
                        className="inline-flex w-full items-center justify-center rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
                      >
                        {isSendingVisit ? "Envoi..." : "Envoyer la demande"}
                      </button>
                      {visitError && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                          {visitError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

                <div
                  data-detail-reveal="true"
                  className="rounded-[1.8rem] border border-neutral-200 bg-white p-6 xl:sticky xl:top-28 xl:z-10"
               >
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950">
                  À savoir
                </h2>
                <div className="mt-5 divide-y divide-neutral-200">
                  {knowItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.title}
                        type="button"
                        className="flex w-full items-start gap-4 py-4 text-left first:pt-0 last:pb-0"
                      >
                        <Icon className="mt-1 shrink-0 text-xl text-neutral-800" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-neutral-950">
                            {item.title}
                          </span>
                          <span className="mt-1 block space-y-0.5 text-sm leading-5 text-neutral-500">
                            {item.lines.map((line) => (
                              <span key={line} className="block">
                                {line}
                              </span>
                            ))}
                          </span>
                        </span>
                        <FiChevronRight className="mt-1 shrink-0 text-neutral-400" />
                      </button>
                    );
                  })}
                </div>
              </div>

                <div
                  data-detail-reveal="true"
                  className="rounded-[1.8rem] border border-neutral-200 bg-white p-6"
               >
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950">
                  Laisser un commentaire
                </h2>
                <textarea
                  rows={4}
                  value={commentDraft}
                  onChange={(event) => {
                    setCommentDraft(event.target.value);
                    setCommentSaved(false);
                  }}
                  placeholder="Votre commentaire..."
                  className="mt-4 w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={handleSaveComment}
                  disabled={!commentDraft.trim()}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Enregistrer le commentaire
                </button>
                {commentSaved && (
                  <p className="mt-2 text-center text-xs font-medium text-emerald-600">
                    Commentaire enregistré sur cet appareil.
                  </p>
                )}
              </div>
            </aside>
          </div>

          <div className="flex items-center justify-end text-xs text-neutral-500">
            <span>ID annonce: {property.id}</span>
          </div>
        </motion.section>
      </main>
      <BottomNav />
    </div>
  );
}
