"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiExternalLink,
  FiEye,
  FiFileText,
  FiHome,
  FiImage,
  FiMail,
  FiPauseCircle,
  FiPhone,
  FiPlayCircle,
  FiSearch,
  FiUser,
  FiVideo,
  FiX,
} from "react-icons/fi";
import type { Map as LeafletMap } from "leaflet";
import { AdminDashboardSkeleton } from "@/components/Skeleton";
import {
  type AdminPropertySummary,
  fetchAdminProperties,
  updateAdminPropertyStatus,
} from "@/lib/admin";
import { useAuthStore } from "@/stores/authStore";

const statusFilters = [
  { key: "all", label: "Toutes" },
  { key: "published", label: "Publiées" },
  { key: "draft", label: "Brouillons" },
  { key: "suspendu", label: "Suspendues" },
];

const statusStyles: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  draft: "bg-amber-50 text-amber-700 ring-amber-100",
  suspendu: "bg-red-50 text-red-700 ring-red-100",
};

const statusLabels: Record<string, string> = {
  published: "Publiée",
  draft: "Brouillon",
  suspendu: "Suspendue",
};

type PreviewDocument = {
  title: string;
  subtitle: string;
  url?: string | null;
  kind: "image" | "video" | "tour" | "missing";
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const isVideoUrl = (url?: string | null) =>
  Boolean(url && /\.(mp4|webm|ogg|mov)$/i.test(url));

function buildPreviewDocuments(property: AdminPropertySummary): PreviewDocument[] {
  const photos = property.photo_urls ?? [];
  return [
    {
      title: "Photos du logement",
      subtitle: photos.length ? `${photos.length} image(s) fournie(s)` : "Aucune photo fournie",
      url: photos[0],
      kind: photos.length ? "image" : "missing",
    },
    {
      title: "Vidéo de présentation",
      subtitle: property.video_url ? "Fichier vidéo disponible" : "Vidéo non fournie",
      url: property.video_url,
      kind: property.video_url ? "video" : "missing",
    },
    {
      title: "Visite 360",
      subtitle: property.tour_360_url ? "Média 360 disponible" : "Visite 360 non fournie",
      url: property.tour_360_url,
      kind: property.tour_360_url
        ? isVideoUrl(property.tour_360_url)
          ? "video"
          : "tour"
        : "missing",
    },
  ];
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
        statusStyles[status] ?? "bg-neutral-100 text-neutral-600 ring-neutral-100"
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

function AdminPropertyMap({
  latitude,
  longitude,
  title,
}: {
  latitude?: number | null;
  longitude?: number | null;
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || latitude == null || longitude == null) return;
    let isMounted = true;

    const init = async () => {
      const leaflet = await import("leaflet");
      if (!isMounted || !containerRef.current) return;

      const map = leaflet
        .map(containerRef.current, {
          zoomControl: false,
          attributionControl: true,
          dragging: true,
          scrollWheelZoom: false,
        })
        .setView([latitude, longitude], 14);
      mapRef.current = map;

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        })
        .addTo(map);

      leaflet
        .marker([latitude, longitude], {
          icon: leaflet.divIcon({
            className: "imc-marker",
            html: '<div class="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950 text-white shadow-lg"><div class="h-3 w-3 rounded-full bg-white"></div></div>',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          }),
          title,
        })
        .addTo(map);

      requestAnimationFrame(() => map.invalidateSize());
    };

    void init();

    return () => {
      isMounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, title]);

  if (latitude == null || longitude == null) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-[1.75rem] bg-neutral-50 px-6 text-center text-sm text-neutral-500">
        Coordonnées non renseignées pour cette annonce.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[280px] min-h-[240px] overflow-hidden rounded-[1.75rem] bg-neutral-100"
    />
  );
}

export default function AdminPublicationsPage() {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [properties, setProperties] = useState<AdminPropertySummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<PreviewDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingPropertyId, setPendingPropertyId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchAdminProperties(token, status === "all" ? undefined : status);
        if (!active) return;
        setProperties(data);
        setSelectedId(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les publications.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [status, token]);

  const filteredProperties = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return properties;
    return properties.filter((property) =>
      [
        property.title,
        property.city,
        property.neighborhood,
        property.owner_name,
        property.owner_email,
        property.owner_phone,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [properties, query]);

  const selectedProperty = useMemo(
    () => filteredProperties.find((property) => property.id === selectedId) ?? null,
    [filteredProperties, selectedId]
  );

  const counts = useMemo(
    () => ({
      total: properties.length,
      published: properties.filter((item) => item.status === "published").length,
      draft: properties.filter((item) => item.status === "draft").length,
      suspended: properties.filter((item) => item.status === "suspendu").length,
    }),
    [properties]
  );

  const setPropertyStatus = async (propertyId: string, nextStatus: string) => {
    if (!token) return;
    setPendingPropertyId(propertyId);
    try {
      const updated = await updateAdminPropertyStatus(token, propertyId, nextStatus);
      setProperties((current) =>
        current
          .map((item) => (item.id === updated.id ? updated : item))
          .filter((item) => status === "all" || item.status === status)
      );
      if (status !== "all" && nextStatus !== status) setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setPendingPropertyId(null);
    }
  };

  const renderList = () => (
    <section className="space-y-7">
      <div className="max-w-4xl">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
          <FiFileText />
          Publications
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
          Modération des annonces
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
          Contrôle les annonces, vérifie les médias fournis et ajuste leur statut sans quitter le
          flux de validation.
        </p>
      </div>

      <div className="grid max-w-4xl grid-cols-4 text-center">
        {[
          ["Total", counts.total],
          ["Publiées", counts.published],
          ["Draft", counts.draft],
          ["Stop", counts.suspended],
        ].map(([label, value]) => (
          <div key={label} className="py-3">
            <p className="text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              {label}
            </p>
          </div>
        ))}
      </div>

      <section className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-[260px] flex-1 items-center gap-3 rounded-full bg-white px-4 py-3 ring-1 ring-neutral-200/80">
          <FiSearch className="text-neutral-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher par annonce, ville ou propriétaire..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatus(filter.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                status === filter.key
                  ? "bg-neutral-950 text-white"
                  : "bg-white text-neutral-600 hover:text-neutral-950"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <AdminDashboardSkeleton />
      ) : (
        <section className="max-w-6xl">
          <div className="divide-y divide-neutral-100">
            {filteredProperties.map((property) => {
              const documentCount = buildPreviewDocuments(property).filter((doc) => doc.url).length;
              return (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => setSelectedId(property.id)}
                  className="grid w-full grid-cols-1 gap-4 py-5 text-left transition hover:text-neutral-950 md:grid-cols-[minmax(0,1.35fr)_120px_160px_120px_56px] md:items-center"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold text-neutral-950">
                      {property.title}
                    </span>
                    <span className="mt-1 block text-sm text-neutral-500">
                      {[property.city, property.neighborhood].filter(Boolean).join(" · ") ||
                        "Localisation non renseignée"}
                    </span>
                    <span className="mt-2 block text-sm font-semibold text-neutral-900">
                      {property.price.toLocaleString("fr-FR")} FCFA / {property.price_period}
                    </span>
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    {property.property_type || "logement"}
                  </span>
                  <span>
                    <span className="inline-flex h-1.5 w-20 overflow-hidden rounded-full bg-neutral-200">
                      <span
                        className="bg-emerald-500"
                        style={{ width: `${Math.min(documentCount / 3, 1) * 100}%` }}
                      />
                    </span>
                    <span className="ml-2 text-xs text-neutral-500">{documentCount}/3</span>
                  </span>
                  <StatusBadge status={property.status} />
                  <span className="flex justify-end text-neutral-400">
                    <FiEye />
                  </span>
                </button>
              );
            })}
          </div>

          {!filteredProperties.length && (
            <div className="py-12 text-sm text-neutral-500">
              Aucune annonce ne correspond aux filtres actuels.
            </div>
          )}
        </section>
      )}
    </section>
  );

  const renderDetail = (property: AdminPropertySummary) => {
    const previewDocuments = buildPreviewDocuments(property);
    const documentCount = previewDocuments.filter((doc) => doc.url).length;
    const hasCoordinates = property.latitude != null && property.longitude != null;
    const googleMapsUrl = hasCoordinates
      ? `https://www.google.com/maps?q=${property.latitude},${property.longitude}`
      : null;

    const timeline = [
      {
        title: "Annonce créée",
        body: `Ajoutée le ${formatDate(property.created_at)}`,
        Icon: FiClock,
      },
      {
        title: "Statut actuel",
        body: statusLabels[property.status] ?? property.status,
        Icon: FiCheckCircle,
      },
      {
        title: "Médias fournis",
        body: `${documentCount}/3 éléments disponibles`,
        Icon: FiImage,
      },
    ];

    return (
      <section className="space-y-8">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
        >
          <FiArrowLeft />
          Retour aux annonces
        </button>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            <header>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={property.status} />
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
                  Détail annonce
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-5xl">
                {property.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
                {[property.address, property.neighborhood, property.city].filter(Boolean).join(" · ") ||
                  "Adresse non renseignée"}
              </p>
            </header>

            <section className="grid gap-3 sm:grid-cols-4">
              {[
                ["Prix", `${property.price.toLocaleString("fr-FR")} FCFA`, `/${property.price_period}`],
                ["Pièces", property.rooms ?? "-", ""],
                ["Bains", property.bathrooms ?? "-", ""],
                ["Surface", property.surface_m2 ?? "-", property.surface_m2 ? "m²" : ""],
              ].map(([label, value, suffix]) => (
                <div key={label} className="bg-white py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                    {value}
                    {suffix && <span className="ml-1 text-sm font-medium text-neutral-500">{suffix}</span>}
                  </p>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight text-neutral-950">Description</h2>
              <p className="max-w-3xl text-sm leading-7 text-neutral-600">
                {property.description || "Aucune description fournie pour cette annonce."}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-neutral-950">Documents et médias</h2>
              <div className="grid gap-3 md:grid-cols-3">
                {previewDocuments.map((document) => {
                  const Icon =
                    document.kind === "video"
                      ? FiVideo
                      : document.kind === "missing"
                        ? FiAlertTriangle
                        : FiImage;
                  return (
                    <button
                      key={document.title}
                      type="button"
                      onClick={() => document.url && setPreviewDocument(document)}
                      disabled={!document.url}
                      className="min-h-32 rounded-[1.5rem] bg-neutral-50 px-5 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Icon className="text-lg text-neutral-500" />
                      <span className="mt-5 block text-sm font-semibold text-neutral-950">
                        {document.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-neutral-500">
                        {document.subtitle}
                      </span>
                      <span className="mt-4 inline-flex text-xs font-semibold text-blue-700">
                        {document.url ? "Prévisualiser" : "Manquant"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-tight text-neutral-950">Localisation</h2>
                {googleMapsUrl && (
                  <Link
                    href={googleMapsUrl}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white"
                  >
                    <FiExternalLink />
                    Ouvrir Maps
                  </Link>
                )}
              </div>
              <AdminPropertyMap
                latitude={property.latitude}
                longitude={property.longitude}
                title={property.title}
              />
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-[1.75rem] bg-neutral-50 p-5">
              <h2 className="text-lg font-semibold tracking-tight text-neutral-950">Historique</h2>
              <div className="mt-5 space-y-5">
                {timeline.map(({ title, body, Icon }) => (
                  <div key={title} className="flex gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-neutral-600">
                      <Icon />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-neutral-950">{title}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-neutral-500">{body}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] bg-neutral-50 p-5">
              <h2 className="text-lg font-semibold tracking-tight text-neutral-950">Propriétaire</h2>
              <div className="mt-5 space-y-3 text-sm text-neutral-600">
                <div className="flex gap-3">
                  <FiUser className="mt-0.5 text-neutral-400" />
                  <span>{property.owner_name || "Propriétaire inconnu"}</span>
                </div>
                <div className="flex gap-3">
                  <FiPhone className="mt-0.5 text-neutral-400" />
                  <span>{property.owner_phone || "Téléphone non renseigné"}</span>
                </div>
                <div className="flex gap-3">
                  <FiMail className="mt-0.5 text-neutral-400" />
                  <span>{property.owner_email || "Email non renseigné"}</span>
                </div>
                <div className="flex gap-3">
                  <FiHome className="mt-0.5 text-neutral-400" />
                  <span>
                    {property.is_furnished ? "Meublé" : "Non meublé"} ·{" "}
                    {property.property_type || "Type non renseigné"}
                  </span>
                </div>
                {property.owner_is_verified && (
                  <div className="flex gap-3 text-emerald-700">
                    <FiCheckCircle className="mt-0.5" />
                    <span>Propriétaire vérifié</span>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-2">
              {property.status !== "published" && (
                <button
                  type="button"
                  onClick={() => void setPropertyStatus(property.id, "published")}
                  disabled={pendingPropertyId === property.id}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
                >
                  <FiPlayCircle />
                  Publier
                </button>
              )}
              {property.status !== "draft" && (
                <button
                  type="button"
                  onClick={() => void setPropertyStatus(property.id, "draft")}
                  disabled={pendingPropertyId === property.id}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
                >
                  <FiEye />
                  Brouillon
                </button>
              )}
              {property.status !== "suspendu" && (
                <button
                  type="button"
                  onClick={() => void setPropertyStatus(property.id, "suspendu")}
                  disabled={pendingPropertyId === property.id}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
                >
                  <FiPauseCircle />
                  Suspendre
                </button>
              )}
            </section>
          </aside>
        </div>
      </section>
    );
  };

  return (
    <main className="mx-auto w-full bg-white px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {selectedProperty ? renderDetail(selectedProperty) : renderList()}

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </motion.div>

      {previewDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-4">
          <div className="flex h-[min(760px,92vh)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] bg-white">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <FiFileText className="text-neutral-500" />
                  <h2 className="font-semibold text-neutral-950">{previewDocument.title}</h2>
                </div>
                <p className="mt-1 text-xs text-neutral-500">{previewDocument.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                {previewDocument.url && (
                  <Link
                    href={previewDocument.url}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700"
                  >
                    <FiDownload />
                    Ouvrir
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700"
                  aria-label="Fermer"
                >
                  <FiX />
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-neutral-950 p-4 text-white">
              {previewDocument.url && previewDocument.kind === "video" ? (
                <video
                  src={previewDocument.url}
                  controls
                  playsInline
                  className="max-h-full max-w-full"
                />
              ) : previewDocument.url && previewDocument.kind === "tour" ? (
                <iframe
                  src={previewDocument.url}
                  title={previewDocument.title}
                  className="h-full w-full rounded-2xl bg-white"
                />
              ) : previewDocument.url ? (
                <img
                  src={previewDocument.url}
                  alt={previewDocument.title}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <p className="text-sm text-neutral-300">Document indisponible.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
