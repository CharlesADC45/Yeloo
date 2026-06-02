"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import {
  FiArrowLeft,
  FiArrowUp,
  FiCheckCircle,
  FiChevronDown,
  FiCompass,
  FiGrid,
  FiHeart,
  FiHome,
  FiLayers,
  FiMapPin,
  FiMinus,
  FiPlus,
  FiSearch,
  FiSliders,
  FiTarget,
} from "react-icons/fi";
import { BottomNav } from "@/components/BottomNav";
import { MapResultsSkeleton, Skeleton } from "@/components/Skeleton";
import { TopBar } from "@/components/TopBar";
import { AnimatePresence, motion } from "framer-motion";
import { LeafletMap } from "@/components/LeafletMap";
import { useProperties } from "@/hooks/useProperties";
import { useT } from "@/lib/i18n";
import { applyPropertyFilters, PropertyFilters } from "@/lib/properties";
import { useFavoritesStore } from "@/stores/favoritesStore";

const DEFAULT_FILTERS: PropertyFilters = {
  city: "",
  neighborhood: "",
  minPrice: "",
  maxPrice: "",
  propertyType: "",
};
const ABIDJAN_CENTER = { latitude: 5.3599517, longitude: -4.0082563 };
const NEARBY_RADIUS_OPTIONS = [1, 5, 15, 30];

function getDistanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function CartePageContent() {
  const t = useT();
  const router = useRouter();
  const bottomNav = <BottomNav />;
  const [filters, setFilters] = useState<PropertyFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resultsPage, setResultsPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [locateSignal, setLocateSignal] = useState(0);
  const [fitBoundsSignal, setFitBoundsSignal] = useState(0);
  const [zoomSignal, setZoomSignal] = useState(0);
  const [zoomDelta, setZoomDelta] = useState<1 | -1>(1);
  const [isNearbyOpen, setIsNearbyOpen] = useState(false);
  const [nearbySearching, setNearbySearching] = useState(false);
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState<number | null>(null);
  const [nearbyFilter, setNearbyFilter] = useState<{
    latitude: number;
    longitude: number;
    radiusKm: number;
  } | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const resultsPanelRef = useRef<HTMLDivElement | null>(null);
  const secondaryGridRef = useRef<HTMLDivElement | null>(null);
  const paginationRef = useRef<HTMLDivElement | null>(null);
  const mapControlsRef = useRef<HTMLDivElement | null>(null);
  const quickLocationsRef = useRef<HTMLDivElement | null>(null);
  const mobileSheetRef = useRef<HTMLDivElement | null>(null);
  const mobileSheetHandleRef = useRef<HTMLDivElement | null>(null);
  const mobileSheetDragStartRef = useRef(0);
  const hasInitializedMobileSheetRef = useRef(false);
  const mobileSheetContentRef = useRef<HTMLDivElement | null>(null);
  const mobileSheetTopRef = useRef(0);
  const scrollTopTimerRef = useRef<number | null>(null);
  const nearbyZoomTimersRef = useRef<number[]>([]);
  const { properties, isLoading, error, refetch } = useProperties();
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [mobileSheetTop, setMobileSheetTop] = useState(0);
  const [isDraggingMobileSheet, setIsDraggingMobileSheet] = useState(false);
  const [favoritePulseId, setFavoritePulseId] = useState<string | null>(null);

  const baseFiltered = useMemo(
    () => applyPropertyFilters(properties, filters),
    [properties, filters]
  );
  const filtered = useMemo(() => {
    if (!nearbyFilter) return baseFiltered;
    return baseFiltered.filter((property) => {
      if (typeof property.latitude !== "number" || typeof property.longitude !== "number") {
        return false;
      }
      return (
        getDistanceKm(nearbyFilter, {
          latitude: property.latitude,
          longitude: property.longitude,
        }) <= nearbyFilter.radiusKm
      );
    });
  }, [baseFiltered, nearbyFilter]);
  const visibleProperties = useMemo(() => filtered, [filtered]);
  const selected = useMemo(() => {
    if (!selectedId) return null;
    return (
      visibleProperties.find((p) => p.id === selectedId) ||
      properties.find((p) => p.id === selectedId) ||
      null
    );
  }, [visibleProperties, properties, selectedId]);
  const resultsPageSize = 6;
  const totalResultsPages = Math.max(
    1,
    Math.ceil(visibleProperties.length / resultsPageSize)
  );
  const paginatedResultProperties = useMemo(() => {
    const start = (resultsPage - 1) * resultsPageSize;
    return visibleProperties.slice(start, start + resultsPageSize);
  }, [resultsPage, resultsPageSize, visibleProperties]);
  const quickLocations = useMemo(() => {
    const counts = new Map<string, number>();
    visibleProperties.forEach((property) => {
      const key = property.neighborhood || property.city;
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [visibleProperties]);
  const resultsLabel = `${visibleProperties.length} ${
    visibleProperties.length > 1 ? t("homes") : t("home")
  }`;
  const mobileLocationLabel =
    filters.city || filters.neighborhood || selected?.neighborhood || selected?.city || "Abidjan";
  const mobileSearchTitle = `${t("homesInArea")} ${mobileLocationLabel}`;
  const mobileSearchMeta = `${resultsLabel} ${t("availableHomes")}`;
  const mobileSheetBounds = useMemo(() => {
    if (!viewportHeight) return null;

    const full = 84;
    const collapsed = Math.round(viewportHeight - 156);
    const mid = Math.round(viewportHeight * 0.56);

    return {
      full,
      mid: Math.max(full + 190, Math.min(mid, collapsed - 140)),
      collapsed: Math.max(full + 320, collapsed),
    };
  }, [viewportHeight]);
  const mobileSheetSnaps = useMemo(() => {
    if (!mobileSheetBounds) return [];
    return [mobileSheetBounds.full, mobileSheetBounds.mid, mobileSheetBounds.collapsed];
  }, [mobileSheetBounds]);

  const clampMobileSheetTop = (value: number) => {
    if (!mobileSheetBounds) return value;
    return Math.min(mobileSheetBounds.collapsed, Math.max(mobileSheetBounds.full, value));
  };

  const snapMobileSheet = (nextTop: number, velocityY = 0, dragOffset = 0) => {
    if (!mobileSheetBounds || mobileSheetSnaps.length === 0) return;

    if (dragOffset > 56) {
      const lowerSnap = mobileSheetSnaps.find(
        (snap) => snap > mobileSheetDragStartRef.current + 12
      );
      setMobileSheetTop(lowerSnap ?? mobileSheetBounds.collapsed);
      return;
    }

    if (dragOffset < -56) {
      const upperSnap = [...mobileSheetSnaps]
        .reverse()
        .find((snap) => snap < mobileSheetDragStartRef.current - 12);
      setMobileSheetTop(upperSnap ?? mobileSheetBounds.full);
      return;
    }

    if (velocityY > 520) {
      const lowerSnap = mobileSheetSnaps.find((snap) => snap > nextTop);
      setMobileSheetTop(lowerSnap ?? mobileSheetBounds.collapsed);
      return;
    }

    if (velocityY < -520) {
      const upperSnap = [...mobileSheetSnaps].reverse().find((snap) => snap < nextTop);
      setMobileSheetTop(upperSnap ?? mobileSheetBounds.full);
      return;
    }

    const nearest = mobileSheetSnaps.reduce((closest, current) =>
      Math.abs(current - nextTop) < Math.abs(closest - nextTop) ? current : closest
    );

    setMobileSheetTop(nearest);
  };

  const handleShowMap = () => {
    if (!mobileSheetBounds) return;
    setMobileSheetTop(mobileSheetBounds.collapsed);
  };

  const handleZoom = (delta: 1 | -1) => {
    setZoomDelta(delta);
    setZoomSignal((value) => value + 1);
  };

  const animateNearbyZoomOut = (radiusKm: number) => {
    nearbyZoomTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    nearbyZoomTimersRef.current = [];
    const steps = radiusKm >= 30 ? 4 : radiusKm >= 15 ? 3 : radiusKm >= 5 ? 2 : 1;

    nearbyZoomTimersRef.current = Array.from({ length: steps }, (_, index) =>
      window.setTimeout(() => {
        setZoomDelta(-1);
        setZoomSignal((value) => value + 1);
      }, index * 760)
    );
  };

  const scrollResultsToTop = () => {
    mobileSheetContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    resultsPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    if (mobileSheetBounds) {
      setMobileSheetTop(mobileSheetBounds.full);
    }
  };

  const revealScrollTopButton = (scrollTop: number) => {
    const shouldShow = scrollTop > 180;
    setShowScrollTop(shouldShow);
    if (scrollTopTimerRef.current) {
      window.clearTimeout(scrollTopTimerRef.current);
    }
    if (shouldShow) {
      scrollTopTimerRef.current = window.setTimeout(() => {
        setShowScrollTop(false);
      }, 2800);
    }
  };

  const handleNearbyRadiusSelect = (radiusKm: number) => {
    setIsNearbyOpen(false);
    setNearbyRadiusKm(radiusKm);
    setNearbySearching(true);
    handleShowMap();
    animateNearbyZoomOut(radiusKm);
    setLocateSignal((value) => value + 1);

    const finishSearch = (center: { latitude: number; longitude: number }) => {
      window.setTimeout(() => {
        setNearbyFilter({ ...center, radiusKm });
        setNearbySearching(false);
        setResultsPage(1);
        if (mobileSheetBounds) {
          setMobileSheetTop(mobileSheetBounds.full);
        }
        resultsPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        mobileSheetContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 4300);
    };

    if (!navigator.geolocation) {
      finishSearch(ABIDJAN_CENTER);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        finishSearch({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => finishSearch(ABIDJAN_CENTER),
      { enableHighAccuracy: true, maximumAge: 1000 * 60 * 10, timeout: 7000 }
    );
  };

  const clearNearbyFilter = () => {
    setNearbyFilter(null);
    setNearbyRadiusKm(null);
    setResultsPage(1);
  };

  const showPropertyOnMap = (propertyId: string) => {
    setSelectedId(null);
    handleShowMap();
    window.setTimeout(() => {
      setSelectedId(propertyId);
    }, 220);
  };

  const renderNearbyControl = () => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsNearbyOpen((value) => !value)}
        className={`flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-700 shadow-[0_10px_24px_rgba(15,23,42,0.14)] ring-1 ring-black/5 transition hover:text-neutral-950 ${
          nearbyFilter ? "text-blue-700" : ""
        }`}
        aria-label="À proximité"
        title="À proximité"
      >
        <FiCompass className="h-5 w-5" />
      </button>
      <AnimatePresence>
        {isNearbyOpen && (
          <motion.div
            initial={{ opacity: 0, x: 8, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-[3.25rem] top-0 z-30 w-52 rounded-[1.3rem] bg-white p-3 text-sm shadow-[0_22px_54px_rgba(15,23,42,0.2)] ring-1 ring-black/5"
          >
            <p className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              À proximité
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {NEARBY_RADIUS_OPTIONS.map((radius) => (
                <button
                  key={radius}
                  type="button"
                  onClick={() => handleNearbyRadiusSelect(radius)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    nearbyRadiusKm === radius
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-50 text-neutral-700 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {radius} km
                </button>
              ))}
            </div>
            {nearbyFilter && (
              <button
                type="button"
                onClick={clearNearbyFilter}
                className="mt-2 w-full rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600"
              >
                Réinitialiser
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const handleToggleFavorite = (propertyId: string) => {
    setFavoritePulseId(propertyId);
    toggleFavorite(propertyId);
    window.setTimeout(() => {
      setFavoritePulseId((current) => (current === propertyId ? null : current));
    }, 520);
  };

  const getPropertyFacts = (property: (typeof paginatedResultProperties)[number]) =>
    [
      property.rooms ? `${property.rooms} ${property.rooms > 1 ? t("rooms") : t("room")}` : null,
      property.bathrooms
        ? `${property.bathrooms} ${
            property.bathrooms > 1 ? t("bathrooms") : t("bathroom")
          }`
        : null,
      property.surfaceM2 ? `${property.surfaceM2} ${t("sqm")}` : null,
    ].filter((fact): fact is string => Boolean(fact));

  const formatPricePeriod = (period?: string | null) => {
    const normalized = (period || "").trim().toLowerCase();
    if (!normalized || normalized === "mois" || normalized === "month") return t("month");
    return period || t("month");
  };

  const translateBadgeLabel = (label?: string | null) => {
    const normalized = (label || "").trim().toLowerCase();
    if (!normalized) return "";
    if (normalized === "disponible" || normalized === "available") return t("available");
    if (normalized === "réservé" || normalized === "reserve" || normalized === "reserved") {
      return t("reserved");
    }
    if (normalized === "loué" || normalized === "loue" || normalized === "rented") {
      return t("rented");
    }
    if (normalized === "annonce verifiee" || normalized === "annonce vérifiée") {
      return t("listingVerified");
    }
    if (normalized === "annonce suspendue" || normalized === "suspended listing") {
      return t("listingSuspended");
    }
    if (normalized === "brouillon" || normalized === "draft") return t("draft");
    return label || "";
  };

  const renderExpandedFilters = (gridClassName: string) => (
    <>
      <div className={`mt-3 grid gap-3 ${gridClassName}`}>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
            {t("city")}
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70"
            placeholder="Abidjan, Bouake..."
            value={filters.city}
            onChange={handleChange("city")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
            {t("district")}
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70"
            placeholder="Cocody, Marcory..."
            value={filters.neighborhood}
            onChange={handleChange("neighborhood")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
            {t("minPrice")}
          </label>
          <input
            type="number"
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70"
            value={filters.minPrice}
            onChange={handleChange("minPrice")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
            {t("maxPrice")}
          </label>
          <input
            type="number"
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70"
            value={filters.maxPrice}
            onChange={handleChange("maxPrice")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
            {t("propertyType")}
          </label>
          <div className="hide-scrollbar mt-1 flex gap-2 overflow-x-auto rounded-2xl bg-neutral-100 p-1">
            {[
              { value: "", label: t("all"), icon: FiGrid },
              { value: "studio", label: "Studio", icon: FiHome },
              { value: "appartement", label: "Appartement", icon: FiLayers },
              { value: "maison", label: "Maison", icon: FiHome },
              { value: "villa", label: "Villa", icon: FiHome },
            ].map((option) => {
              const Icon = option.icon;
              const isActive = filters.propertyType === option.value;
              return (
                <button
                  key={option.value || "all"}
                  type="button"
                  onClick={() => setFilters((current) => ({ ...current, propertyType: option.value }))}
                  className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-white text-neutral-950 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
        <span>{resultsLabel} {t("displayed")}</span>
        <button
          type="button"
          onClick={() => setFilters(DEFAULT_FILTERS)}
          className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
        >
          {t("reset")}
        </button>
      </div>
    </>
  );

  const renderMobilePropertyCard = (property: (typeof paginatedResultProperties)[number]) => {
    const facts = getPropertyFacts(property);
    const isFavorite = favoriteIds.includes(property.id);
    const isPulsing = favoritePulseId === property.id;

    return (
    <article
      key={`mobile-${property.id}`}
      onClick={() => router.push(`/logements/${property.id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/logements/${property.id}`);
        }
      }}
      role="link"
      tabIndex={0}
      className="overflow-hidden rounded-[1.75rem] bg-white focus:outline-none"
    >
      <div className="relative h-72 overflow-hidden rounded-[1.75rem]">
        <img
          src={property.imageUrl}
          alt={property.title}
          onError={(event) => {
            event.currentTarget.src = "/property-fallback.svg";
          }}
          className="h-full w-full object-cover"
        />
        <div className="absolute left-3 top-3 flex max-w-[72%] flex-wrap items-center gap-2">
          {property.promoLabel && (
            <span className="rounded-full bg-blue-700 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm">
              {property.promoLabel}
            </span>
          )}
          {property.ownerIsVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-800 shadow-[0_6px_18px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
              <FiCheckCircle className="text-xs text-blue-600" />
              {t("verified")}
            </span>
          )}
          {property.badgeLabel && (
            <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-800 shadow-[0_6px_18px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
              {translateBadgeLabel(property.badgeLabel)}
            </span>
          )}
        </div>
        <motion.button
          type="button"
          animate={
            isPulsing
              ? { scale: [1, 1.22, 0.96, 1.05, 1], rotate: [0, -12, 10, -4, 0] }
              : { scale: 1, rotate: 0 }
          }
          transition={{ duration: 0.48, ease: "easeOut" }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.9 }}
          onClick={(event) => {
            event.stopPropagation();
            handleToggleFavorite(property.id);
          }}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur"
          aria-label="Ajouter aux favoris"
        >
          <AnimatePresence>
            {isPulsing && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0.55 }}
                animate={{ scale: 1.9, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-white/65"
              />
            )}
          </AnimatePresence>
          <FiHeart
            className={`relative ${isFavorite ? "fill-white text-white" : ""}`}
          />
        </motion.button>
      </div>
      <div className="space-y-1.5 px-1 pb-1 pt-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[1.08rem] font-semibold leading-tight text-neutral-950">
            {property.title}
          </p>
          <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
            {formatPricePeriod(property.pricePeriod)}
          </span>
        </div>
        {(property.neighborhood || property.city) && (
          <p className="text-sm leading-4 text-neutral-600">
            {property.neighborhood || property.city}
          </p>
        )}
        {facts.length > 0 && (
          <p className="text-sm leading-4 text-neutral-600">{facts.join(" · ")}</p>
        )}
        <p className="text-[0.98rem] leading-5 text-neutral-900">
          <span className="font-semibold">{property.price.toLocaleString("en-US")} FCFA</span>
          <span className="text-neutral-500"> / {formatPricePeriod(property.pricePeriod)}</span>
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPropertyOnMap(property.id);
            }}
            className="w-full rounded-full bg-neutral-950 px-4 py-2.5 text-center text-xs font-semibold text-white"
          >
            {t("viewOnMap")}
          </button>
        </div>
      </div>
    </article>
    );
  };

  useEffect(() => {
    if (selectedId && !visibleProperties.some((p) => p.id === selectedId)) {
      setSelectedId(null);
    }
  }, [visibleProperties, selectedId]);

  useEffect(() => {
    setResultsPage(1);
  }, [filters.city, filters.maxPrice, filters.minPrice, filters.neighborhood, filters.propertyType]);

  useEffect(() => {
    if (resultsPage > totalResultsPages) {
      setResultsPage(totalResultsPages);
    }
  }, [resultsPage, totalResultsPages]);

  useEffect(() => {
    if (!selectedId) return;

    const selectedIndex = visibleProperties.findIndex((property) => property.id === selectedId);
    if (selectedIndex === -1) return;

    const nextPage = Math.floor(selectedIndex / resultsPageSize) + 1;
    if (nextPage !== resultsPage) {
      setResultsPage(nextPage);
    }
  }, [resultsPage, resultsPageSize, selectedId, visibleProperties]);

  useEffect(() => {
    if (!mapControlsRef.current) return;

    const buttons = mapControlsRef.current.querySelectorAll("button");
    const context = gsap.context(() => {
      gsap.fromTo(
        buttons,
        { x: -18, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.44,
          stagger: 0.06,
          ease: "power3.out",
        }
      );
    }, mapControlsRef);

    return () => context.revert();
  }, []);

  useEffect(() => {
    if (!quickLocationsRef.current) return;

    const chips = quickLocationsRef.current.querySelectorAll("button");
    const context = gsap.context(() => {
      gsap.fromTo(
        chips,
        { y: 10, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.34,
          stagger: 0.04,
          ease: "power2.out",
        }
      );
    }, quickLocationsRef);

    return () => context.revert();
  }, [quickLocations]);

  useEffect(() => {
    if (!secondaryGridRef.current) return;

    const cards = secondaryGridRef.current.querySelectorAll("[data-result-card='true']");
    const context = gsap.context(() => {
      gsap.fromTo(
        cards,
        {
          y: 24,
          opacity: 0,
          scale: 0.986,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.46,
          stagger: 0.06,
          ease: "power3.out",
          clearProps: "transform",
        }
      );

      if (paginationRef.current) {
        gsap.fromTo(
          paginationRef.current,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.32,
            ease: "power2.out",
          }
        );
      }
    }, secondaryGridRef);

    return () => context.revert();
  }, [paginatedResultProperties, resultsPage]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight);
    };

    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    return () => window.removeEventListener("resize", updateViewportHeight);
  }, []);

  useEffect(() => {
    const mobileContent = mobileSheetContentRef.current;
    const desktopPanel = resultsPanelRef.current;

    const handleMobileScroll = () => {
      if (mobileContent) revealScrollTopButton(mobileContent.scrollTop);
    };
    const handleDesktopScroll = () => {
      if (desktopPanel) revealScrollTopButton(desktopPanel.scrollTop);
    };

    mobileContent?.addEventListener("scroll", handleMobileScroll, { passive: true });
    desktopPanel?.addEventListener("scroll", handleDesktopScroll, { passive: true });
    return () => {
      mobileContent?.removeEventListener("scroll", handleMobileScroll);
      desktopPanel?.removeEventListener("scroll", handleDesktopScroll);
      if (scrollTopTimerRef.current) {
        window.clearTimeout(scrollTopTimerRef.current);
      }
    };
  }, [mobileSheetTop]);

  useEffect(() => {
    return () => {
      nearbyZoomTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      nearbyZoomTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!mobileSheetBounds) return;

    setMobileSheetTop((current) => {
      if (!hasInitializedMobileSheetRef.current) {
        hasInitializedMobileSheetRef.current = true;
        return mobileSheetBounds.collapsed;
      }

      return clampMobileSheetTop(current);
    });
  }, [mobileSheetBounds]);

  useEffect(() => {
    mobileSheetTopRef.current = mobileSheetTop;
  }, [mobileSheetTop]);

  useEffect(() => {
    const sheet = mobileSheetRef.current;
    const container = mobileSheetContentRef.current;
    const handle = mobileSheetHandleRef.current;
    if (!sheet || !container || !mobileSheetBounds) return;

    let startY: number | null = null;
    let lastY: number | null = null;
    let startTop = mobileSheetTopRef.current;
    let draggingSheet = false;

    const handleTouchStart = (event: TouchEvent) => {
      if (handle?.contains(event.target as Node)) return;

      const firstTouch = event.touches[0];
      if (!firstTouch) return;

      startY = firstTouch.clientY;
      lastY = firstTouch.clientY;
      startTop = mobileSheetTopRef.current;
      draggingSheet = false;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (handle?.contains(event.target as Node)) return;

      const firstTouch = event.touches[0];
      if (!firstTouch || startY === null) return;

      const currentY = firstTouch.clientY;
      const deltaY = currentY - startY;
      const atTop = container.scrollTop <= 10;
      lastY = currentY;

      if (!draggingSheet) {
        if (atTop && deltaY > 8) {
          draggingSheet = true;
          startTop = mobileSheetTopRef.current;
          mobileSheetDragStartRef.current = startTop;
          setIsDraggingMobileSheet(true);
        } else {
          return;
        }
      }

      event.preventDefault();
      container.scrollTop = 0;
      setMobileSheetTop(clampMobileSheetTop(startTop + deltaY));
    };

    const handleTouchEnd = () => {
      if (draggingSheet && startY !== null) {
        const dragOffset = (lastY ?? startY) - startY;
        const nextTop = clampMobileSheetTop(startTop + dragOffset);
        snapMobileSheet(nextTop, 0, dragOffset);
      }

      startY = null;
      lastY = null;
      draggingSheet = false;
      setIsDraggingMobileSheet(false);
    };

    sheet.addEventListener("touchstart", handleTouchStart, { passive: true, capture: true });
    sheet.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });
    sheet.addEventListener("touchend", handleTouchEnd, { capture: true });
    sheet.addEventListener("touchcancel", handleTouchEnd, { capture: true });

    return () => {
      sheet.removeEventListener("touchstart", handleTouchStart, { capture: true });
      sheet.removeEventListener("touchmove", handleTouchMove, { capture: true });
      sheet.removeEventListener("touchend", handleTouchEnd, { capture: true });
      sheet.removeEventListener("touchcancel", handleTouchEnd, { capture: true });
    };
  }, [mobileSheetBounds]);

  useEffect(() => {
    const handle = mobileSheetHandleRef.current;
    if (!handle || !mobileSheetBounds) return;

    let startY: number | null = null;
    let lastY: number | null = null;
    let startTop = mobileSheetTopRef.current;

    const beginDrag = (clientY: number) => {
      startY = clientY;
      lastY = clientY;
      startTop = mobileSheetTopRef.current;
      mobileSheetDragStartRef.current = startTop;
      setIsDraggingMobileSheet(true);
    };

    const updateDrag = (clientY: number) => {
      if (startY === null) return;
      lastY = clientY;
      setMobileSheetTop(clampMobileSheetTop(startTop + (clientY - startY)));
    };

    const finishDrag = () => {
      if (startY !== null) {
        const dragOffset = (lastY ?? startY) - startY;
        const nextTop = clampMobileSheetTop(startTop + dragOffset);
        snapMobileSheet(nextTop, 0, dragOffset);
      }

      startY = null;
      lastY = null;
      setIsDraggingMobileSheet(false);
    };

    const onTouchStart = (event: TouchEvent) => {
      const firstTouch = event.touches[0];
      if (!firstTouch) return;
      beginDrag(firstTouch.clientY);
    };

    const onTouchMove = (event: TouchEvent) => {
      const firstTouch = event.touches[0];
      if (!firstTouch || startY === null) return;
      event.preventDefault();
      updateDrag(firstTouch.clientY);
    };

    const onPointerDown = (event: PointerEvent) => {
      beginDrag(event.clientY);
      handle.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (startY === null) return;
      event.preventDefault();
      updateDrag(event.clientY);
    };

    const onPointerUp = () => {
      if (startY === null) return;
      finishDrag();
    };

    handle.addEventListener("touchstart", onTouchStart, { passive: true });
    handle.addEventListener("touchmove", onTouchMove, { passive: false });
    handle.addEventListener("touchend", finishDrag);
    handle.addEventListener("touchcancel", finishDrag);
    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);

    return () => {
      handle.removeEventListener("touchstart", onTouchStart);
      handle.removeEventListener("touchmove", onTouchMove);
      handle.removeEventListener("touchend", finishDrag);
      handle.removeEventListener("touchcancel", finishDrag);
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
      handle.removeEventListener("pointercancel", onPointerUp);
    };
  }, [mobileSheetBounds]);

  const handleChange =
    (field: keyof PropertyFilters) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFilters((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleQuickSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFilters((prev) => ({ ...prev, city: value }));
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white lg:h-[100svh] lg:overflow-hidden">
      <div className="hidden lg:block">
        <TopBar />
      </div>
      
      <main
        className="mx-auto h-[100svh] w-full max-w-full overflow-hidden px-0 pb-0 pt-0 sm:px-6 lg:fixed lg:inset-x-0 lg:bottom-0 lg:top-[5.5rem] lg:h-auto lg:overflow-hidden lg:px-12 lg:pb-6 lg:pt-6"
      >

        <section className="h-full lg:hidden">
          <div className="relative h-full overflow-hidden bg-white">
            <div className="relative h-full w-full overflow-hidden bg-white">
                <div className="absolute inset-x-3 top-3 z-50 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => router.replace("/")}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow-[0_10px_24px_rgba(15,23,42,0.14)] ring-1 ring-black/5 backdrop-blur"
                    aria-label="Retour"
                  >
                    <FiArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="min-w-0 flex-1 rounded-[1.45rem] bg-white/95 px-3 py-2.5 shadow-[0_14px_30px_rgba(15,23,42,0.14)] ring-1 ring-black/5 backdrop-blur">
                    <label className="flex items-center gap-2.5 rounded-full px-1 py-0.5">
                      <FiSearch className="h-4.5 w-4.5 shrink-0 text-neutral-500" />
                      <input
                        value={filters.city}
                        onChange={handleQuickSearch}
                        placeholder={mobileSearchTitle}
                        className="w-full min-w-0 bg-transparent text-sm font-semibold text-neutral-950 outline-none placeholder:font-semibold placeholder:text-neutral-500"
                        aria-label={t("searchHousingAria")}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilters((prev) => !prev)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow-[0_10px_24px_rgba(15,23,42,0.14)] ring-1 ring-black/5 backdrop-blur"
                    aria-label={t("filters")}
                  >
                    <FiSliders className="h-4.5 w-4.5" />
                  </button>
                </div>

              <AnimatePresence initial={false}>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.22 }}
                    className="absolute inset-x-3 top-[4.35rem] z-50 rounded-[1.5rem] bg-white/95 p-3 shadow-[0_22px_54px_rgba(15,23,42,0.2)] ring-1 ring-white/70 backdrop-blur-xl"
                  >
                    {renderExpandedFilters("grid-cols-1")}
                  </motion.div>
                )}
              </AnimatePresence>

              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <LeafletMap
                  properties={visibleProperties}
                  selectedId={selectedId}
                  locateSignal={locateSignal}
                  fitBoundsSignal={fitBoundsSignal}
                  zoomSignal={zoomSignal}
                  zoomDelta={zoomDelta}
                  onSelect={(property) => setSelectedId(property.id)}
                  showLayerToggle={false}
                  className="h-full min-h-[100svh]"
                />
              )}

              <div className="absolute right-4 top-[5.5rem] z-10 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setFitBoundsSignal((value) => value + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-700 shadow-[0_10px_24px_rgba(15,23,42,0.14)] ring-1 ring-black/5"
                  aria-label={t("map")}
                  title={t("map")}
                >
                  <FiHome className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setLocateSignal((value) => value + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-700 shadow-[0_10px_24px_rgba(15,23,42,0.14)] ring-1 ring-black/5"
                  aria-label="Position"
                  title="Position"
                >
                  <FiTarget className="h-5 w-5" />
                </button>
                <div className="overflow-hidden rounded-full bg-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] ring-1 ring-black/5">
                  <button
                    type="button"
                    onClick={() => handleZoom(1)}
                    className="flex h-11 w-11 items-center justify-center bg-white text-neutral-800 transition hover:bg-neutral-50"
                    aria-label="Zoom avant"
                    title="Zoom avant"
                  >
                    <FiPlus className="h-5 w-5" />
                  </button>
                  <div className="mx-auto h-px w-6 bg-neutral-200" />
                  <button
                    type="button"
                    onClick={() => handleZoom(-1)}
                    className="flex h-11 w-11 items-center justify-center bg-white text-neutral-800 transition hover:bg-neutral-50"
                    aria-label="Zoom arrière"
                    title="Zoom arrière"
                  >
                    <FiMinus className="h-5 w-5" />
                  </button>
                </div>
                {renderNearbyControl()}
              </div>
              <AnimatePresence>
                {nearbySearching && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
                  >
                    <div className="relative flex h-56 w-56 items-center justify-center rounded-full bg-blue-600/10">
                      <motion.span
                        className="absolute h-full w-full rounded-full border border-blue-600/35"
                        animate={{ scale: [0.28, 1.65, 2.65], opacity: [0.9, 0.32, 0] }}
                        transition={{ duration: 2.45, repeat: Infinity, ease: "easeOut" }}
                      />
                      <motion.span
                        className="absolute h-36 w-36 rounded-full border border-blue-600/25"
                        animate={{ scale: [0.35, 1.75, 2.9], opacity: [0.82, 0.26, 0] }}
                        transition={{ duration: 2.45, repeat: Infinity, delay: 0.58, ease: "easeOut" }}
                      />
                      <motion.span
                        className="absolute h-24 w-24 rounded-full bg-blue-600/15"
                        animate={{ scale: [0.45, 2.05, 3.25], opacity: [0.58, 0.2, 0] }}
                        transition={{ duration: 2.45, repeat: Infinity, delay: 1.16, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.div
              ref={mobileSheetRef}
              className="absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-[0_-18px_40px_rgba(15,23,42,0.14)]"
              style={{
                top: mobileSheetTop ? `${mobileSheetTop}px` : undefined,
                transition: isDraggingMobileSheet ? "none" : "top 260ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <div
                ref={mobileSheetHandleRef}
                className="absolute inset-x-0 top-0 z-30 flex h-11 touch-none items-start justify-center px-4 pt-3"
              >
                <div
                  aria-hidden="true"
                  className="h-1.5 w-14 rounded-full bg-neutral-300 shadow-[0_1px_0_rgba(255,255,255,0.55)]"
                />
              </div>

              <div className="shrink-0 border-b border-neutral-200/80 bg-white px-4 pb-4 pt-8">
                <div>
                  <p className="text-[1.7rem] font-semibold tracking-tight text-neutral-950">
                    {resultsLabel}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">{t("resultsRanking")}</p>
                  {nearbyFilter && (
                    <button
                      type="button"
                      onClick={clearNearbyFilter}
                      className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                    >
                      À proximité · {nearbyFilter.radiusKm} km
                    </button>
                  )}
                </div>
              </div>

              <div
                ref={mobileSheetContentRef}
                className="hide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[7.75rem] pt-5"
              >
                <div className="space-y-5">

                {isLoading && <MapResultsSkeleton />}
                {!isLoading && error && (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-red-700">
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      {t("retry")}
                    </button>
                  </div>
                )}
                {!isLoading && !error && visibleProperties.length === 0 && (
                  <p className="text-sm text-neutral-600">
                    {t("noHomesMatch")}
                  </p>
                )}

                {!isLoading && !error && paginatedResultProperties.length > 0 && (
                  <div className="grid grid-cols-1 gap-6 min-[720px]:grid-cols-2">
                    {paginatedResultProperties.map((property) => renderMobilePropertyCard(property))}
                  </div>
                )}

                {visibleProperties.length > resultsPageSize && (
                  <div
                    ref={paginationRef}
                    className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-xs text-neutral-500">
                      {t("page")} {resultsPage} / {totalResultsPages}
                    </p>
                    <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
                      <button
                        type="button"
                        disabled={resultsPage === 1}
                        onClick={() => setResultsPage((page) => Math.max(1, page - 1))}
                        className="min-w-0 flex-1 rounded-full border border-neutral-200 px-3 py-2 text-center text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                      >
                        {t("previous")}
                      </button>
                      <button
                        type="button"
                        disabled={resultsPage === totalResultsPages}
                        onClick={() =>
                          setResultsPage((page) => Math.min(totalResultsPages, page + 1))
                        }
                        className="min-w-0 flex-1 rounded-full bg-neutral-900 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 sm:flex-none"
                      >
                        {t("next")}
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>
              {showScrollTop && (
                <button
                  type="button"
                  onClick={scrollResultsToTop}
                  className="absolute bottom-5 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-950 text-white shadow-[0_16px_34px_rgba(15,23,42,0.24)] transition hover:bg-neutral-800"
                  aria-label="Remonter"
                  title="Remonter"
                >
                  <FiArrowUp className="h-5 w-5" />
                </button>
              )}
            </motion.div>

            <AnimatePresence initial={false}>
              {mobileSheetBounds && mobileSheetTop < mobileSheetBounds.collapsed - 20 && (
                <motion.button
                  type="button"
                  onClick={handleShowMap}
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="absolute bottom-[5.9rem] right-2 z-30 inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.22)] sm:right-4"
                >
                  <span>{t("showMap")}</span>
                  <FiMapPin className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </section>

        <section className="hidden h-full max-w-full overflow-hidden px-0 lg:block">
          <div className="grid h-full w-full max-w-full gap-0 overflow-hidden lg:grid-cols-2 lg:items-stretch lg:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="relative order-1 flex h-full min-h-[62vh] w-full min-w-0 max-w-full flex-col overflow-hidden bg-transparent lg:min-h-0 lg:max-w-[calc(100vw-1rem)] lg:rounded-[1.6rem] lg:border lg:border-neutral-200 lg:bg-white lg:shadow-[0_14px_40px_rgba(15,23,42,0.08)]"
            >
              {isLoading ? (
                <Skeleton className="min-h-[62vh] flex-1 lg:min-h-0" />
              ) : (
                <LeafletMap
                  properties={visibleProperties}
                  selectedId={selectedId}
                  locateSignal={locateSignal}
                  fitBoundsSignal={fitBoundsSignal}
                  zoomSignal={zoomSignal}
                  zoomDelta={zoomDelta}
                  onSelect={(property) => setSelectedId(property.id)}
                  className="min-h-[62vh] flex-1 lg:h-full lg:min-h-0"
                />
              )}
              <div
                ref={mapControlsRef}
                className="absolute right-4 top-4 z-10 hidden flex-col gap-3 lg:flex"
              >
                <button
                  type="button"
                  onClick={() => setFitBoundsSignal((value) => value + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-700 shadow-[0_10px_24px_rgba(15,23,42,0.14)] ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:text-neutral-950"
                  aria-label={t("map")}
                  title={t("map")}
                >
                  <FiHome className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setLocateSignal((value) => value + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-700 shadow-[0_10px_24px_rgba(15,23,42,0.14)] ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:text-neutral-950"
                  aria-label="Position"
                  title="Position"
                >
                  <FiTarget className="h-5 w-5" />
                </button>
                <div className="overflow-hidden rounded-full bg-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] ring-1 ring-black/5">
                  <button
                    type="button"
                    onClick={() => handleZoom(1)}
                    className="flex h-11 w-11 items-center justify-center bg-white text-neutral-800 transition hover:bg-neutral-50"
                    aria-label="Zoom avant"
                    title="Zoom avant"
                  >
                    <FiPlus className="h-5 w-5" />
                  </button>
                  <div className="mx-auto h-px w-6 bg-neutral-200" />
                  <button
                    type="button"
                    onClick={() => handleZoom(-1)}
                    className="flex h-11 w-11 items-center justify-center bg-white text-neutral-800 transition hover:bg-neutral-50"
                    aria-label="Zoom arrière"
                    title="Zoom arrière"
                  >
                    <FiMinus className="h-5 w-5" />
                  </button>
                </div>
                {renderNearbyControl()}
              </div>
              <AnimatePresence>
                {nearbySearching && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
                  >
                    <div className="relative flex h-64 w-64 items-center justify-center rounded-full bg-blue-600/10">
                      <motion.span
                        className="absolute h-full w-full rounded-full border border-blue-600/35"
                        animate={{ scale: [0.28, 1.65, 2.7], opacity: [0.9, 0.32, 0] }}
                        transition={{ duration: 2.55, repeat: Infinity, ease: "easeOut" }}
                      />
                      <motion.span
                        className="absolute h-40 w-40 rounded-full border border-blue-600/25"
                        animate={{ scale: [0.35, 1.75, 2.95], opacity: [0.82, 0.26, 0] }}
                        transition={{ duration: 2.55, repeat: Infinity, delay: 0.6, ease: "easeOut" }}
                      />
                      <motion.span
                        className="absolute h-28 w-28 rounded-full bg-blue-600/15"
                        animate={{ scale: [0.45, 2.05, 3.3], opacity: [0.58, 0.2, 0] }}
                        transition={{ duration: 2.55, repeat: Infinity, delay: 1.18, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {!isLoading && selected && (
                <div className="pointer-events-none absolute inset-x-4 bottom-28 z-10 lg:bottom-4">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/96 px-4 py-2 text-sm text-neutral-700 shadow-[0_10px_24px_rgba(15,23,42,0.12)] ring-1 ring-black/5 backdrop-blur">
                    <FiMapPin className="shrink-0 text-neutral-500" />
                    <span className="truncate font-medium">
                      {selected.neighborhood || selected.city || selected.title}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="relative order-2 z-20 -mt-12 mb-24 w-full min-w-0 max-w-full overflow-x-hidden rounded-t-[2rem] bg-white px-4 pb-4 pt-4 shadow-[0_-18px_40px_rgba(15,23,42,0.14)] sm:mx-2 sm:max-w-[calc(100%-1rem)] sm:rounded-[2rem] lg:z-auto lg:mt-0 lg:mb-0 lg:h-full lg:min-h-0 lg:max-w-[calc(100vw-1rem)] lg:overflow-hidden lg:rounded-[1.6rem] lg:border lg:border-neutral-200 lg:bg-white lg:px-0 lg:pb-0 lg:pt-0 lg:shadow-[0_14px_40px_rgba(15,23,42,0.08)]"
            >
              <div
                ref={resultsPanelRef}
                className="hide-scrollbar lg:h-full lg:overflow-y-auto lg:px-5 lg:pb-5"
              >
                <div className="space-y-5">
                  <div className="space-y-4 lg:hidden">
                    <div className="mx-auto h-1.5 w-14 rounded-full bg-neutral-300" />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[1.7rem] font-semibold tracking-tight text-neutral-950">
                          {resultsLabel}
                        </p>
                        <p className="mt-1 text-sm text-neutral-500">
                          {t("resultsRanking")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFilters((prev) => !prev)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-sm"
                        aria-label="Ouvrir les filtres"
                      >
                        <FiSliders className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    {quickLocations.length > 0 && (
                      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
                        {quickLocations.map(([label, count]) => (
                          <button
                            key={`mobile-${label}`}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                city: label,
                                neighborhood: label,
                              }))
                            }
                            className="shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
                          >
                            {label} ({count})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                <div className="hidden lg:sticky lg:top-0 lg:z-30 lg:-mx-5 lg:block lg:bg-white lg:px-5 lg:pb-5 lg:pt-5">
                  <div className="space-y-5">
                    <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                        <input
                          value={filters.city}
                          onChange={handleQuickSearch}
                          placeholder={t("searchDistrictOrCity")}
                          className="w-full min-w-0 flex-1 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFilters((prev) => !prev)}
                          className="w-full rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 sm:w-auto"
                        >
                          {showFilters ? t("hideFilters") : t("showFilters")}
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {showFilters && (
                          <motion.div
                            key="carte-filters-panel"
                            initial={{ height: 0, opacity: 0, y: -8 }}
                            animate={{ height: "auto", opacity: 1, y: 0 }}
                            exit={{ height: 0, opacity: 0, y: -8 }}
                            transition={{ duration: 0.24, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            {renderExpandedFilters("sm:grid-cols-2 lg:grid-cols-5")}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                          {t("mapSearch")}
                        </p>
                        <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                          {resultsLabel} {t("inLocation")} Abidjan
                        </h2>
                      </div>
                    </div>

                    {quickLocations.length > 0 && (
                      <div
                        ref={quickLocationsRef}
                        className="hide-scrollbar flex gap-2 overflow-x-auto pb-1"
                      >
                        {quickLocations.map(([label, count]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                city: label,
                                neighborhood: label,
                              }))
                            }
                            className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                          >
                            {label} ({count})
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        className="w-full rounded-full border border-neutral-900 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-auto"
                      >
                        {t("saveSearch")}
                      </button>
                      <p className="text-sm text-neutral-500">{resultsLabel} {t("displayed")}</p>
                    </div>
                  </div>
                </div>

                {isLoading && <MapResultsSkeleton />}
                {!isLoading && error && (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-red-700">
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      {t("retry")}
                    </button>
                  </div>
                )}
                {!isLoading && !error && visibleProperties.length === 0 && (
                  <p className="text-sm text-neutral-600">
                    {t("noHomesMatch")}
                  </p>
                )}

                {!isLoading && !error && paginatedResultProperties.length > 0 && (
                  <>
                    <div
                      ref={secondaryGridRef}
                      className="grid grid-cols-1 gap-5 md:grid-cols-2"
                    >
                    {paginatedResultProperties.map((property) => {
                      const facts = getPropertyFacts(property);
                      const isFavorite = favoriteIds.includes(property.id);
                      const isPulsing = favoritePulseId === property.id;

                      return (
                      <article
                        key={property.id}
                        data-result-card="true"
                        onClick={() => router.push(`/logements/${property.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/logements/${property.id}`);
                          }
                        }}
                        role="link"
                        tabIndex={0}
                        className={`group relative overflow-hidden rounded-[1.55rem] border bg-white text-left transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-300/70 ${
                          selected?.id === property.id
                            ? "border-neutral-900 ring-2 ring-neutral-200"
                            : "border-neutral-200"
                        }`}
                      >
                        <div className="relative h-64 overflow-hidden">
                          <img
                            src={property.imageUrl}
                            alt={property.title}
                            onError={(event) => {
                              event.currentTarget.src = "/property-fallback.svg";
                            }}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute left-3 top-3 flex max-w-[72%] flex-wrap items-center gap-2">
                            {property.promoLabel && (
                              <span className="rounded-full bg-blue-700 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm">
                                {property.promoLabel}
                              </span>
                            )}
                            {selected?.id === property.id && (
                              <span className="rounded-full bg-neutral-950/85 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur">
                                {t("onMap")}
                              </span>
                            )}
                            {property.ownerIsVerified && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-800 shadow-[0_6px_18px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
                                <FiCheckCircle className="text-xs text-blue-600" />
                                {t("verified")}
                              </span>
                            )}
                            {property.badgeLabel && (
                              <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-800 shadow-[0_6px_18px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
                                {translateBadgeLabel(property.badgeLabel)}
                              </span>
                            )}
                          </div>
                          <motion.button
                            type="button"
                            animate={
                              isPulsing
                                ? { scale: [1, 1.22, 0.96, 1.05, 1], rotate: [0, -12, 10, -4, 0] }
                                : { scale: 1, rotate: 0 }
                            }
                            transition={{ duration: 0.48, ease: "easeOut" }}
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleFavorite(property.id);
                            }}
                            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-neutral-700 shadow-sm ring-1 ring-black/5 backdrop-blur"
                            aria-label="Ajouter aux favoris"
                          >
                            <AnimatePresence>
                              {isPulsing && (
                                <motion.span
                                  initial={{ scale: 0.8, opacity: 0.55 }}
                                  animate={{ scale: 1.9, opacity: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.5, ease: "easeOut" }}
                                  className="absolute inset-0 rounded-full bg-blue-300/55"
                                />
                              )}
                            </AnimatePresence>
                            <FiHeart
                              className={`relative ${
                                isFavorite ? "fill-blue-600 text-blue-600" : ""
                              }`}
                            />
                          </motion.button>
                        </div>
                        <div className="space-y-1.5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-base font-semibold tracking-tight text-neutral-950">
                                {property.price.toLocaleString("en-US")} FCFA
                                <span className="font-normal text-neutral-500"> / {formatPricePeriod(property.pricePeriod)}</span>
                              </p>
                              <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-neutral-900">
                                {property.title}
                              </p>
                            </div>
                          </div>
                          {(property.neighborhood || property.city) && (
                            <div className="flex items-center gap-2 text-sm leading-4 text-neutral-500">
                              <FiMapPin className="text-neutral-400" />
                              <p className="line-clamp-1">
                                {property.neighborhood || property.city}
                              </p>
                            </div>
                          )}
                          {facts.length > 0 && (
                            <div className="text-xs leading-4 text-neutral-500">
                              {facts.join(" · ")}
                            </div>
                          )}
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                showPropertyOnMap(property.id);
                              }}
                              className="w-full rounded-full bg-neutral-950 px-4 py-2.5 text-center text-xs font-semibold text-white"
                            >
                              {t("viewOnMap")}
                            </button>
                          </div>
                        </div>
                      </article>
                      );
                    })}
                    </div>

                    {visibleProperties.length > resultsPageSize && (
                      <div
                        ref={paginationRef}
                        className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <p className="text-xs text-neutral-500">
                          {t("page")} {resultsPage} / {totalResultsPages}
                        </p>
                        <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
                          <button
                            type="button"
                            disabled={resultsPage === 1}
                            onClick={() => setResultsPage((page) => Math.max(1, page - 1))}
                            className="min-w-0 flex-1 rounded-full border border-neutral-200 px-3 py-2 text-center text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                          >
                            {t("previous")}
                          </button>
                          <button
                            type="button"
                            disabled={resultsPage === totalResultsPages}
                            onClick={() =>
                              setResultsPage((page) =>
                                Math.min(totalResultsPages, page + 1)
                              )
                            }
                            className="min-w-0 flex-1 rounded-full bg-neutral-900 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 sm:flex-none"
                          >
                            {t("next")}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      {bottomNav}
    </div>
  );
}

export default function CartePage() {
  return <CartePageContent />;
}
