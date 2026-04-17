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
  FiExternalLink,
  FiFileText,
  FiHeart,
  FiHome,
  FiLayers,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiPlay,
  FiShare2,
  FiShield,
  FiTool,
} from "react-icons/fi";
import { BottomNav } from "@/components/BottomNav";
import { PannellumViewer } from "@/components/PannellumViewer";
import { DetailPageSkeleton } from "@/components/Skeleton";
import { TopBar } from "@/components/TopBar";
import { fetchPublicModules } from "@/lib/modules";
import { useProperty } from "@/hooks/useProperties";
import { ensureConversation } from "@/lib/messages";
import { useAuthStore } from "@/stores/authStore";
import { useFavoritesStore } from "@/stores/favoritesStore";

type Props = {
  id: string;
};

type MapProps = {
  latitude?: number;
  longitude?: number;
  title: string;
  isApproximate?: boolean;
};

const ABIDJAN_CENTER = { latitude: 5.3599517, longitude: -4.0082563 };

function buildDetailLocationIcon() {
  return `
    <div class="imc-user-location">
      <span class="imc-user-location__halo"></span>
      <span class="imc-user-location__pin">
        <span class="imc-user-location__dot"></span>
      </span>
      <span class="imc-user-location__stem"></span>
    </div>
  `;
}

function PropertyMap({ latitude, longitude, title, isApproximate = false }: MapProps) {
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
            html: buildDetailLocationIcon(),
            iconSize: [44, 56],
            iconAnchor: [22, 46],
          }),
          interactive: true,
        })
        .addTo(mapRef.current);
      markerRef.current.bindTooltip(
        `<div class="imc-hover-card imc-hover-card--compact">
          <div class="imc-hover-card__header">
            <p class="imc-hover-card__title">${title}${isApproximate ? " · zone approximative" : ""}</p>
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
  }, [latitude, longitude, title, isApproximate]);

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
        className="absolute right-4 top-4 z-[500] inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-800 shadow-[0_14px_34px_rgba(15,23,42,0.18)]"
        aria-label={isSatellite ? "Afficher le plan" : "Afficher en mode satellite"}
        title={isSatellite ? "Plan" : "Satellite"}
      >
        <FiLayers className="text-lg" />
      </button>
    </div>
  );
  }

function PropertyStreetView({ latitude, longitude, title, isApproximate = false }: MapProps) {
  const hasCoordinates = typeof latitude === "number" && typeof longitude === "number";
  const streetViewUrl = hasCoordinates
    ? `https://www.google.com/maps?layer=c&cbll=${latitude},${longitude}&cbp=11,0,0,0,0&output=svembed`
    : "";
  const mapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : "https://www.google.com/maps/search/Abidjan";

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-950">Street View</h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            {hasCoordinates && !isApproximate
              ? "Aperçu de la zone autour du bien."
              : "Aperçu approximatif de la zone, selon les informations disponibles."}
          </p>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-3 py-2 text-xs font-semibold text-white"
        >
          Ouvrir Maps
          <FiExternalLink />
        </a>
      </div>
      <div className="relative h-64 bg-neutral-100 sm:h-72">
        {hasCoordinates ? (
          <iframe
            title={`Street View ${title}`}
            src={streetViewUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-neutral-500">
            Street View sera disponible quand les coordonnées exactes seront ajoutées.
          </div>
        )}
      </div>
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
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSaved, setCommentSaved] = useState(false);

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

  const tourImage = gallery[1] ?? gallery[0];
  const videoImage = gallery[2] ?? gallery[0];
  const tourUrl = property?.tour360Url;
  const videoUrl = property?.videoUrl;
  const isTourImage = Boolean(tourUrl && !/\.(mp4|webm|ogg|mov)$/i.test(tourUrl));
  const isOwnerViewer = user?.role === "proprietaire" || user?.role === "admin";
  const ownerLabel = property?.ownerIsVerified ? "Propriétaire vérifié" : "Propriétaire Yeloo";
  const ownerInitial = ownerLabel.charAt(0).toUpperCase();
  const pricePeriodLabel = property?.pricePeriod || "mois";
  const detailStats = property
    ? [
        { label: "Pièces", value: property.rooms ? `${property.rooms}` : "Non renseigné" },
        { label: "Bains", value: property.bathrooms ? `${property.bathrooms}` : "Non renseigné" },
        {
          label: "Surface",
          value: property.surfaceM2 ? `${property.surfaceM2} m²` : "Non renseignée",
        },
        {
          label: "Caution",
          value: property.depositMonths ? `${property.depositMonths} mois` : "Non renseignée",
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
          label: "Statut",
          value: property.isVerified ? "Annonce vérifiée" : "Annonce en cours",
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

  const handleSaveComment = () => {
    if (!resolvedId) return;
    try {
      window.localStorage.setItem(
        `yeloo:listing-comment:${resolvedId}`,
        commentDraft.trim()
      );
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
        setIsChatEnabled(chatModule ? chatModule.is_enabled : true);
      } catch {
        if (active) {
          setIsChatEnabled(true);
        }
      }
    };

    void loadModules();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!resolvedId || typeof window === "undefined") return;
    try {
      setCommentDraft(window.localStorage.getItem(`yeloo:listing-comment:${resolvedId}`) || "");
      setCommentSaved(false);
    } catch {
      setCommentDraft("");
    }
  }, [resolvedId]);

  useEffect(() => {
    setActiveSlide(0);
    sliderRef.current?.scrollTo({ left: 0, behavior: "smooth" });
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
    <div ref={detailRootRef} className="min-h-screen bg-transparent">
      <TopBar />
      <main className="mx-auto w-full max-w-[1450px] px-4 pb-32 pt-28 sm:px-8 lg:px-12">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-8"
        >
          <div data-detail-reveal="true" className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-soft"
              >
                <FiChevronLeft />
                Retour
              </button>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-[2.2rem]">
                  {property.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <FiMapPin className="text-sm" />
                    {locationLabel || property.city}
                  </span>
                  {property.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                      <FiCheckCircle className="text-sm" />
                      Annonce vérifiée
                    </span>
                  )}
                  {property.ownerIsVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                      <FiCheckCircle className="text-sm" />
                      Propriétaire vérifié
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_380px]">
            <div className="space-y-6">
              <section data-detail-reveal="true" className="bg-white py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Prix et aperçu
                </p>
                <div className="mt-3 flex flex-col gap-5 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
                      {property.price.toLocaleString("fr-FR")} FCFA
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">par {pricePeriodLabel}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                    {detailStats.map((item) => (
                      <div key={item.label}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-neutral-900">{item.value}</p>
                      </div>
                    ))}
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
                <p className="mt-4 max-w-3xl text-[15px] leading-8 text-neutral-700">
                  {property.description ||
                    "Cette annonce n'a pas encore de description détaillée. Utilisez le flow de demande pour échanger avec le propriétaire et confirmer les derniers détails."}
                </p>
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
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                  Faites connaissance avec la personne qui a publié ce logement
                </h2>
                <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                  <div className="border-y border-neutral-200 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center bg-neutral-950 text-2xl font-semibold text-white">
                        {ownerInitial}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-neutral-950">{ownerLabel}</p>
                        <p className="mt-1 text-sm text-neutral-500">
                          Hôte sur Yeloo
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-3 divide-x divide-neutral-200 border-t border-neutral-200 pt-4 text-center">
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
                      <div>
                        <p className="text-lg font-semibold text-neutral-950">Direct</p>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-500">
                          Contact
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-y border-neutral-200 py-5">
                    <h3 className="text-base font-semibold text-neutral-950">
                      Informations sur le propriétaire
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
                      Ce propriétaire publie son logement sur Yeloo pour garder un échange clair,
                      centralisé et vérifiable avant toute décision.
                    </p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="flex gap-3 border border-neutral-200 p-4">
                        <FiCheckCircle className="mt-0.5 text-blue-600" />
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">
                            Statut du profil
                          </p>
                          <p className="mt-1 text-sm text-neutral-500">
                            {property.ownerIsVerified
                              ? "Propriétaire vérifié par la plateforme"
                              : "Profil propriétaire en cours de vérification"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 border border-neutral-200 p-4">
                        <FiMessageCircle className="mt-0.5 text-blue-600" />
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">
                            Échange locataire
                          </p>
                          <p className="mt-1 text-sm text-neutral-500">
                            Message direct depuis l’annonce pour poser vos questions.
                          </p>
                        </div>
                      </div>
                    </div>
                    {!isOwnerViewer && isChatEnabled && (
                      <button
                        type="button"
                        onClick={() => void handleOpenChat()}
                        disabled={isOpeningChat}
                        className="mt-5 inline-flex items-center justify-center bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
                      >
                        {isOpeningChat ? "Ouverture..." : "Envoyer un message au propriétaire"}
                      </button>
                    )}
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
                    isApproximate={!hasExactLocation}
                  />
                  {!hasExactLocation && (
                    <p className="border-b border-neutral-200 pb-4 text-xs leading-6 text-neutral-500">
                      Position approximative: les coordonnées exactes n'ont pas encore été ajoutées par le propriétaire.
                    </p>
                  )}
                  <PropertyStreetView
                    latitude={mapLatitude}
                    longitude={mapLongitude}
                    title={property.title}
                    isApproximate={!hasExactLocation}
                  />
                </div>
              </section>

               <section data-detail-reveal="true" className="grid gap-6 lg:grid-cols-2">
                  <div
                    className="border-t border-neutral-200 bg-white py-5"
                  >
                  <h2 className="text-lg font-semibold text-neutral-900">Visite 360°</h2>
                  <div className="relative mt-3 h-52 overflow-hidden bg-neutral-100">
                    {tourUrl && isTourImage ? (
                      <PannellumViewer imageUrl={tourUrl} className="h-full w-full" />
                    ) : (
                      <>
                        {tourImage && (
                          <img
                            src={tourImage}
                            alt={`Visite 360 ${property.title}`}
                            onError={(event) => {
                              event.currentTarget.src = "/property-fallback.svg";
                            }}
                            className="h-full w-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-neutral-700 shadow-soft">
                            {tourUrl ? "Visite 360 disponible" : "Photo 360 bientôt disponible"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                  <div
                    className="border-t border-neutral-200 bg-white py-5"
                  >
                  <h2 className="text-lg font-semibold text-neutral-900">Vidéo</h2>
                  <div className="relative mt-3 h-52 overflow-hidden bg-neutral-100">
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
                            alt={`Vidéo ${property.title}`}
                            onError={(event) => {
                              event.currentTarget.src = "/property-fallback.svg";
                            }}
                            className="h-full w-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-neutral-700 shadow-soft">
                            <FiPlay />
                            Vidéo de présentation bientôt disponible
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
                <div
                  data-detail-reveal="true"
                  className="rounded-[1.8rem] border border-neutral-200 bg-white p-6"
               >
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
                  Contact & décision
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-900">
                  Intéressé par ce logement ?
                </h2>
                <p className="mt-3 text-sm text-neutral-600">
                  Posez vos questions au propriétaire et gardez l’annonce en favori pendant votre prise de décision.
                </p>

                <div className="mt-5 space-y-3 text-sm text-neutral-700">
                  {[
                    "Discutez directement avec le propriétaire depuis cette annonce",
                    "Vérifiez les médias, la localisation, la caution et les garanties du bien",
                    "Gardez vos échanges au même endroit pour reprendre plus tard",
                  ].map((step, index) => (
                    <div key={step} className="flex gap-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                        {index + 1}
                      </span>
                      <p>{step}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3">
                  {!isOwnerViewer && isChatEnabled && (
                    <button
                      type="button"
                      onClick={() => void handleOpenChat()}
                      disabled={isOpeningChat}
                      className="inline-flex w-full items-center justify-center rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
                    >
                      {isOpeningChat ? "Ouverture..." : "Contacter le propriétaire"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => resolvedId && toggleFavorite(resolvedId)}
                    className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                  >
                    {isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  </button>
                  {!isAuthenticated && (
                    <Link
                      href={`/connexion?next=/logements/${property.id}`}
                      className="inline-flex w-full items-center justify-center rounded-full border border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-700"
                    >
                      Se connecter pour continuer
                    </Link>
                  )}
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center rounded-full border border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-700"
                  >
                    <FiPhone className="mr-2" />
                    Assistance Yeloo
                  </button>
                  {chatError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                      {chatError}
                    </div>
                  )}
                </div>
              </div>

                <div
                  data-detail-reveal="true"
                  className="rounded-[1.8rem] border border-neutral-200 bg-white p-6"
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
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  Notez vos questions ou remarques avant de contacter le propriétaire.
                </p>
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

          <div className="flex justify-between text-xs text-neutral-500">
            <Link href="/" className="hover:text-neutral-700">
              Retour aux annonces
            </Link>
            <span>ID annonce: {property.id}</span>
          </div>
        </motion.section>
      </main>
      <BottomNav />
    </div>
  );
}
