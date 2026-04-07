"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import {
  FiCheckCircle,
  FiChevronDown,
  FiExternalLink,
  FiHeart,
  FiHome,
  FiLayers,
  FiTarget,
  FiMapPin,
  FiNavigation,
  FiSettings,
} from "react-icons/fi";
import { BottomNav } from "@/components/BottomNav";
import { MapResultsSkeleton, Skeleton } from "@/components/Skeleton";
import { TopBar } from "@/components/TopBar";
import { AnimatePresence, motion } from "framer-motion";
import { MapboxMap } from "@/components/MapboxMap";
import { useProperties } from "@/hooks/useProperties";
import { applyPropertyFilters, PropertyFilters } from "@/lib/properties";
import { useFavoritesStore } from "@/stores/favoritesStore";

const DEFAULT_FILTERS: PropertyFilters = {
  city: "",
  neighborhood: "",
  minPrice: "",
  maxPrice: "",
  propertyType: "",
};

function CartePageContent() {
  const bottomNav = <BottomNav />;
  const [filters, setFilters] = useState<PropertyFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resultsPage, setResultsPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [locateSignal, setLocateSignal] = useState(0);
  const [fitBoundsSignal, setFitBoundsSignal] = useState(0);
  const resultsPanelRef = useRef<HTMLDivElement | null>(null);
  const featuredCardRef = useRef<HTMLDivElement | null>(null);
  const secondaryGridRef = useRef<HTMLDivElement | null>(null);
  const paginationRef = useRef<HTMLDivElement | null>(null);
  const mapControlsRef = useRef<HTMLDivElement | null>(null);
  const quickLocationsRef = useRef<HTMLDivElement | null>(null);
  const { properties, isLoading, error, refetch } = useProperties();
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);

  const filtered = useMemo(
    () => applyPropertyFilters(properties, filters),
    [properties, filters]
  );
  const visibleProperties = useMemo(() => filtered, [filtered]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return (
      visibleProperties.find((p) => p.id === selectedId) ||
      properties.find((p) => p.id === selectedId) ||
      null
    );
  }, [visibleProperties, properties, selectedId]);
  const featuredProperty = selected ?? visibleProperties[0] ?? null;
  const secondaryProperties = useMemo(
    () =>
      featuredProperty
        ? visibleProperties.filter((property) => property.id !== featuredProperty.id)
        : visibleProperties,
    [featuredProperty, visibleProperties]
  );
  const secondaryPageSize = 4;
  const totalSecondaryPages = Math.max(
    1,
    Math.ceil(secondaryProperties.length / secondaryPageSize)
  );
  const paginatedSecondaryProperties = useMemo(() => {
    const start = (resultsPage - 1) * secondaryPageSize;
    return secondaryProperties.slice(start, start + secondaryPageSize);
  }, [resultsPage, secondaryProperties]);
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

  const selectedCoords =
    selected && typeof selected.latitude === "number" && typeof selected.longitude === "number"
      ? {
          lat: selected.latitude,
          lng: selected.longitude,
        }
      : null;

  const googleMapsUrl = selectedCoords
    ? `https://www.google.com/maps?q=${selectedCoords.lat},${selectedCoords.lng}`
    : null;
  const mapControls = [
    { key: "layers", icon: FiLayers, label: "Couches" },
    { key: "home", icon: FiHome, label: "Accueil" },
    { key: "locate", icon: FiTarget, label: "Position" },
    { key: "settings", icon: FiSettings, label: "Paramètres" },
  ];
  const navigationUrl = selectedCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedCoords.lat},${selectedCoords.lng}`
    : null;

  useEffect(() => {
    if (selectedId && !visibleProperties.some((p) => p.id === selectedId)) {
      setSelectedId(null);
    }
  }, [visibleProperties, selectedId]);

  useEffect(() => {
    setResultsPage(1);
  }, [filters.city, filters.maxPrice, filters.minPrice, filters.neighborhood, filters.propertyType]);

  useEffect(() => {
    if (resultsPage > totalSecondaryPages) {
      setResultsPage(totalSecondaryPages);
    }
  }, [resultsPage, totalSecondaryPages]);

  useEffect(() => {
    if (!selectedId) return;
    resultsPanelRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [selectedId]);

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
    if (!featuredCardRef.current) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        featuredCardRef.current,
        {
          y: 18,
          opacity: 0.74,
          scale: 0.985,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.42,
          ease: "power3.out",
          clearProps: "transform",
        }
      );
    }, featuredCardRef);

    return () => context.revert();
  }, [featuredProperty?.id, selectedId]);

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
  }, [paginatedSecondaryProperties, resultsPage]);

  const handleChange =
    (field: keyof PropertyFilters) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFilters((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleQuickSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFilters((prev) => ({ ...prev, city: value }));
  };

  const animateListingHover = (target: EventTarget | null, active: boolean) => {
    if (!(target instanceof HTMLElement)) return;

    gsap.to(target, {
      y: active ? -8 : 0,
      scale: active ? 1.015 : 1,
      boxShadow: active
        ? "0 22px 48px rgba(37,99,235,0.16)"
        : "0 10px 30px rgba(0,0,0,0.08)",
      borderColor: active ? "#93c5fd" : "#e5e7eb",
      duration: active ? 0.24 : 0.28,
      ease: active ? "power2.out" : "power2.inOut",
      overwrite: "auto",
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f2f7ff_38%,#f8fafc_100%)]">
      <TopBar />
      <main
        className="mx-auto w-full max-w-full overflow-x-hidden px-0 pb-44 pt-28 sm:px-6 sm:pb-32 sm:pt-32 lg:px-12"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-2"
        >
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Carte</h1>
          <p className="text-xs text-neutral-600 sm:text-sm">
            Filtre les logements FastAPI et clique sur un point pour voir un aperçu
            sur la carte.
          </p>
        </motion.div>

        <section className="mt-6 max-w-full space-y-4 overflow-x-hidden px-2 sm:px-0">
          <div className="rounded-3xl border border-white/80 bg-white/90 p-3 shadow-soft backdrop-blur-sm sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <input
                value={filters.city}
                onChange={handleQuickSearch}
                placeholder="Recherche quartier ou ville..."
                className="w-full min-w-0 flex-1 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
              />
              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className="w-full rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 sm:w-auto"
              >
                {showFilters ? "Masquer filtres" : "Afficher filtres"}
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
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Ville
                      </label>
                      <input
                        className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                        placeholder="Abidjan, Bouake..."
                        value={filters.city}
                        onChange={handleChange("city")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Quartier
                      </label>
                      <input
                        className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                        placeholder="Cocody, Marcory..."
                        value={filters.neighborhood}
                        onChange={handleChange("neighborhood")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Min (FCFA)
                      </label>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                        value={filters.minPrice}
                        onChange={handleChange("minPrice")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Max (FCFA)
                      </label>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                        value={filters.maxPrice}
                        onChange={handleChange("maxPrice")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Type de bien
                      </label>
                      <select
                        className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                        value={filters.propertyType}
                        onChange={handleChange("propertyType")}
                      >
                        <option value="">Tous</option>
                        <option value="studio">Studio</option>
                        <option value="appartement">Appartement</option>
                        <option value="maison">Maison</option>
                        <option value="villa">Villa</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
                    <span>{visibleProperties.length} logement(s) affiché(s)</span>
                    <button
                      type="button"
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                      className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                    >
                      Réinitialiser
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid w-full max-w-full gap-4 overflow-x-hidden xl:grid-cols-[minmax(0,1.45fr)_560px] xl:gap-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="relative w-full min-w-0 max-w-[calc(100vw-1rem)] flex h-full min-h-[420px] flex-col overflow-hidden rounded-[1.6rem] border border-white/80 bg-white/90 shadow-soft backdrop-blur-sm sm:max-w-full sm:min-h-[660px] sm:rounded-[2rem] xl:sticky xl:top-32 xl:min-h-[860px]"
            >
              {isLoading ? (
                <Skeleton className="flex-1 min-h-[300px] rounded-b-none sm:min-h-[600px] xl:min-h-[760px]" />
              ) : (
                <MapboxMap
                  properties={visibleProperties}
                  selectedId={selected?.id}
                  onSelect={(property) => setSelectedId(property.id)}
                  locateSignal={locateSignal}
                  fitBoundsSignal={fitBoundsSignal}
                  className="flex-1 min-h-[300px] sm:min-h-[600px] xl:min-h-[760px]"
                />
              )}
              <div
                ref={mapControlsRef}
                className="absolute left-3 top-20 z-10 flex flex-col gap-3 sm:left-4 sm:top-24"
              >
                {mapControls.map((control) => {
                  const Icon = control.icon;
                  const onClick = () => {
                    if (control.key === "locate") {
                      setLocateSignal((value) => value + 1);
                    }
                    if (control.key === "home") {
                      setFitBoundsSignal((value) => value + 1);
                    }
                  };
                  return (
                    <button
                      key={control.key}
                      type="button"
                      onClick={onClick}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-lg ring-1 ring-neutral-200 transition hover:-translate-y-0.5 hover:text-blue-700"
                      aria-label={control.label}
                      title={control.label}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-neutral-100 px-3 py-4 sm:px-6">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-56 rounded-lg" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-28 rounded-lg" />
                      <Skeleton className="h-9 w-24 rounded-lg" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <FiMapPin className="text-neutral-400" />
                      {selectedCoords ? (
                        <span>
                          {selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}
                        </span>
                      ) : (
                        <span>Sélectionnez un logement pour afficher les coordonnées.</span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {googleMapsUrl ? (
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          <FiExternalLink />
                          Google Maps
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-400"
                        >
                          <FiExternalLink />
                          Google Maps
                        </button>
                      )}
                      {navigationUrl ? (
                        <a
                          href={navigationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          <FiNavigation />
                          Itinéraire
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-200 px-3 py-2 text-xs font-semibold text-white"
                        >
                          <FiNavigation />
                          Itinéraire
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              ref={resultsPanelRef}
              className="mb-24 w-full min-w-0 max-w-[calc(100vw-1rem)] overflow-x-hidden rounded-[1.6rem] border border-white/80 bg-white/90 p-3 shadow-soft backdrop-blur-sm sm:max-w-full sm:mb-0 sm:rounded-[2rem] sm:p-5 xl:max-h-[860px] xl:overflow-y-auto"
            >
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                    Logements à Abidjan
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Découvre les résultats synchronisés avec la carte.
                  </p>
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
                      className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:w-auto"
                    >
                      Save Search
                    </button>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-end gap-2 text-sm font-medium text-blue-700 sm:w-auto"
                    >
                      Prix · croissant
                      <FiChevronDown className="text-base" />
                    </button>
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
                      Réessayer
                    </button>
                  </div>
                )}
                {!isLoading && !error && visibleProperties.length === 0 && (
                  <p className="text-sm text-neutral-600">
                    Aucun logement ne correspond aux filtres actuels.
                  </p>
                )}

                {!isLoading && !error && featuredProperty && (
                  <motion.div
                    key={`featured-${featuredProperty.id}`}
                    ref={featuredCardRef}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: selectedId === featuredProperty.id ? 1.01 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className={`overflow-hidden rounded-[1.6rem] border bg-white shadow-soft transition-all duration-200 ${
                      selectedId === featuredProperty.id
                        ? "border-blue-300 ring-2 ring-blue-200/70 shadow-[0_20px_48px_rgba(37,99,235,0.16)]"
                        : "border-blue-200"
                    }`}
                  >
                    <div className="relative h-60 overflow-hidden">
                      <img
                        src={featuredProperty.imageUrl}
                        alt={featuredProperty.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-4 text-white">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-2xl font-bold tracking-tight">
                              {featuredProperty.price.toLocaleString("fr-FR")} FCFA
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm font-medium text-white/90">
                              {featuredProperty.title}
                            </p>
                          </div>
                          <motion.button
                            type="button"
                            animate={
                              favoriteIds.includes(featuredProperty.id)
                                ? { scale: [1, 1.16, 1], rotate: [0, -10, 8, 0] }
                                : { scale: 1, rotate: 0 }
                            }
                            transition={{ duration: 0.34, ease: "easeOut" }}
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggleFavorite(featuredProperty.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-sm"
                            aria-label="Ajouter aux favoris"
                          >
                            <FiHeart
                              className={
                                favoriteIds.includes(featuredProperty.id)
                                  ? "fill-blue-600 text-blue-600"
                                  : ""
                              }
                            />
                          </motion.button>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/90">
                          <span>{featuredProperty.rooms ?? "—"} Beds</span>
                          <span>{featuredProperty.bathrooms ?? "—"} Baths</span>
                          <span>{featuredProperty.surfaceM2 ?? "—"} Sqm.</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedId === featuredProperty.id && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                            Sur la carte
                          </span>
                        )}
                        {featuredProperty.ownerIsVerified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            <FiCheckCircle className="text-sm" />
                            Propriétaire vérifié
                          </span>
                        )}
                        {featuredProperty.isVerified && (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Annonce vérifiée
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/logements/${featuredProperty.id}`}
                        className="w-full rounded-full border border-neutral-200 px-3 py-2 text-center text-xs font-semibold text-neutral-700 hover:bg-neutral-50 sm:w-auto"
                      >
                        Voir la fiche
                      </Link>
                    </div>
                  </motion.div>
                )}

                {!isLoading && !error && secondaryProperties.length > 0 && (
                  <>
                    <div
                      ref={secondaryGridRef}
                      className="grid grid-cols-1 gap-4 md:grid-cols-2"
                    >
                    {paginatedSecondaryProperties.map((property) => (
                      <article
                        key={property.id}
                        data-result-card="true"
                        onClick={() => setSelectedId(property.id)}
                        onMouseEnter={(event) => animateListingHover(event.currentTarget, true)}
                        onMouseLeave={(event) => animateListingHover(event.currentTarget, false)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedId(property.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className={`group relative overflow-hidden rounded-[1.4rem] border text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300/70 ${
                          selected?.id === property.id
                            ? "border-blue-400 bg-blue-50/50 shadow-[0_18px_45px_rgba(37,99,235,0.18)] ring-2 ring-blue-200/80 -translate-y-0.5"
                            : "border-neutral-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-soft"
                        }`}
                      >
                        <div
                          className={`pointer-events-none absolute inset-x-0 top-0 h-1 transition-all duration-200 ${
                            selected?.id === property.id
                              ? "bg-gradient-to-r from-blue-500 via-sky-400 to-blue-600 opacity-100"
                              : "bg-transparent opacity-0"
                          }`}
                        />
                        <div className="relative h-56 overflow-hidden sm:h-52">
                          <img
                            src={property.imageUrl}
                            alt={property.title}
                            className={`h-full w-full object-cover transition-transform duration-300 ${
                              selected?.id === property.id ? "scale-[1.03]" : "group-hover:scale-[1.02]"
                            }`}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-4 text-white">
                            <div className="flex items-end justify-between gap-3">
                              <div>
                                <p className="text-2xl font-bold">
                                  {property.price.toLocaleString("fr-FR")}
                                </p>
                                <p className="line-clamp-1 text-sm text-white/90">
                                  {property.title}
                                </p>
                              </div>
                              <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold">
                                {property.pricePeriod}
                              </span>
                            </div>
                          </div>
                          <motion.button
                            type="button"
                            animate={
                              favoriteIds.includes(property.id)
                                ? { scale: [1, 1.16, 1], rotate: [0, -10, 8, 0] }
                                : { scale: 1, rotate: 0 }
                            }
                            transition={{ duration: 0.34, ease: "easeOut" }}
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavorite(property.id);
                            }}
                            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-sm"
                            aria-label="Ajouter aux favoris"
                          >
                            <FiHeart
                              className={
                                favoriteIds.includes(property.id)
                                  ? "fill-blue-600 text-blue-600"
                                  : ""
                              }
                            />
                          </motion.button>
                        </div>
                          <div className="space-y-3 p-4">
                          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="line-clamp-1 text-sm font-semibold text-neutral-900">
                              {property.neighborhood || property.city}
                            </p>
                            <span className="text-xs text-neutral-500">
                              {property.rooms ?? "—"} · {property.bathrooms ?? "—"} · {property.surfaceM2 ?? "—"}
                            </span>
                          </div>
                          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                              {property.ownerIsVerified && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                  <FiCheckCircle className="text-xs" />
                                  Vérifié
                                </span>
                              )}
                              {property.badgeLabel && (
                                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
                                  {property.badgeLabel}
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/logements/${property.id}`}
                              onClick={(event) => event.stopPropagation()}
                              className={`w-full break-words text-left text-xs font-semibold transition sm:w-auto sm:text-right ${
                                selected?.id === property.id
                                  ? "text-blue-800"
                                  : "text-blue-700 hover:text-blue-800"
                              }`}
                            >
                              Voir les détails
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                    </div>

                    {secondaryProperties.length > secondaryPageSize && (
                      <div
                        ref={paginationRef}
                        className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <p className="text-xs text-neutral-500">
                          Page {resultsPage} / {totalSecondaryPages}
                        </p>
                        <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
                          <button
                            type="button"
                            disabled={resultsPage === 1}
                            onClick={() => setResultsPage((page) => Math.max(1, page - 1))}
                            className="min-w-0 flex-1 rounded-full border border-neutral-200 px-3 py-2 text-center text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                          >
                            Précédent
                          </button>
                          <button
                            type="button"
                            disabled={resultsPage === totalSecondaryPages}
                            onClick={() =>
                              setResultsPage((page) =>
                                Math.min(totalSecondaryPages, page + 1)
                              )
                            }
                            className="min-w-0 flex-1 rounded-full bg-blue-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:flex-none"
                          >
                            Suivant
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
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


