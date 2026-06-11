import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiHeart } from "react-icons/fi";
import { useFavoritesStore } from "@/stores/favoritesStore";
import type { Property, PropertyFilters } from "@/lib/properties";
import { applyPropertyFilters } from "@/lib/properties";
import { PropertyGridSkeleton } from "@/components/Skeleton";

type Props = {
  filters: PropertyFilters;
  properties: Property[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  showHeader?: boolean;
  title?: string;
  subtitle?: string;
  borderlessCards?: boolean;
  initialVisibleCount?: number;
};

export function PropertyGrid({
  filters,
  properties,
  isLoading,
  error,
  onRetry,
  showHeader = true,
  title = "Logements populaires à Abidjan",
  subtitle = "Résultats filtrés selon vos critères.",
  borderlessCards = false,
  initialVisibleCount,
}: Props) {
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const showMoreTimerRef = useRef<number | null>(null);

  const filtered = applyPropertyFilters(properties, filters);
  const showEmpty = !isLoading && !error && filtered.length === 0;
  const formatPrice = (value: number) => value.toLocaleString("en-US");
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount ?? Number.POSITIVE_INFINITY);
  const [isShowingMore, setIsShowingMore] = useState(false);
  const limitedGrid = typeof initialVisibleCount === "number";
  const visibleProperties = limitedGrid ? filtered.slice(0, visibleCount) : filtered;
  const canShowMore = limitedGrid && visibleCount < filtered.length;

  useEffect(() => {
    if (showMoreTimerRef.current) {
      window.clearTimeout(showMoreTimerRef.current);
    }
    setIsShowingMore(false);
    setVisibleCount(initialVisibleCount ?? Number.POSITIVE_INFINITY);
  }, [filters.city, filters.maxPrice, filters.minPrice, filters.neighborhood, filters.propertyType, initialVisibleCount]);

  useEffect(() => {
    return () => {
      if (showMoreTimerRef.current) {
        window.clearTimeout(showMoreTimerRef.current);
      }
    };
  }, []);

  const handleShowMore = () => {
    if (isShowingMore) return;
    setIsShowingMore(true);
    showMoreTimerRef.current = window.setTimeout(() => {
      setVisibleCount((count) => count + (initialVisibleCount ?? 10));
      setIsShowingMore(false);
    }, 650);
  };

  return (
    <div>
      {showHeader && (
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h2>
          <p className="text-xs text-neutral-500">{subtitle}</p>
        </div>
      )}

      {isLoading && (
        <PropertyGridSkeleton />
      )}
      {!isLoading && error && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          <span>{error}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Réessayer
            </button>
          )}
        </div>
      )}
      {showEmpty && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-600 shadow-soft">
          Aucun logement pour le moment. Revenez bientôt.
        </div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="mt-4 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visibleProperties.map((p) => (
            <Link
              key={p.id}
              href={`/logements/${p.id}`}
              className={`group flex h-full flex-col bg-white/90 backdrop-blur-sm transition ${
                borderlessCards
                  ? "overflow-visible border-0"
                  : "overflow-hidden rounded-[1.7rem] border border-white/80"
              }`}
            >
              <div className="relative h-56 w-full overflow-hidden rounded-[1.7rem] sm:h-60 lg:h-64">
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  onError={(event) => {
                    event.currentTarget.src = "/property-fallback.svg";
                  }}
                  className="h-full w-full object-cover"
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleFavorite(p.id);
                  }}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-soft hover:bg-white"
                  aria-label="Ajouter aux favoris"
                >
                  <FiHeart
                    className={`text-lg ${
                    favoriteIds.includes(p.id) ? "fill-blue-600 text-blue-600" : ""
                    }`}
                  />
                </motion.button>
                {p.promoLabel && (
                  <div className="absolute left-3 top-3">
                    <span className="rounded-full bg-blue-700 px-3 py-1 text-[11px] font-semibold text-white shadow-soft">
                      {p.promoLabel}
                    </span>
                  </div>
                )}
                {p.availabilityStatus !== "available" && (
                  <div className={`absolute left-3 ${p.promoLabel ? "top-11" : "top-3"}`}>
                    <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-blue-700 shadow-soft">
                      {p.availabilityLabel}
                    </span>
                  </div>
                )}
                {p.availabilityStatus === "available" && (
                  <div className={`absolute left-3 ${p.promoLabel ? "top-11" : "top-3"}`}>
                    <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-blue-700 shadow-soft">
                      {p.availabilityLabel}
                    </span>
                  </div>
                )}
                {p.isVerified && (
                  <div
                    className={`absolute left-3 ${
                      p.promoLabel && p.availabilityStatus
                        ? "top-[4.75rem]"
                        : p.promoLabel || p.availabilityStatus
                          ? "top-11"
                          : "top-3"
                    }`}
                  >
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-neutral-700 shadow-soft">
                      Annonce vérifiée
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col px-1 pt-2">
                <div className="flex items-start gap-2">
                  <h3 className="line-clamp-2 text-base font-semibold leading-tight text-neutral-900">
                    {p.title}
                  </h3>
                </div>
                <p className="mt-1 line-clamp-1 text-sm leading-5 text-neutral-600">
                  {p.propertyType ? `${p.propertyType} · ` : ""}
                  {p.city}
                </p>
                <p className="min-h-[1.25rem] text-sm text-neutral-500">
                  {typeof p.rooms === "number" ? `${p.rooms} lits` : "— lits"} •{" "}
                  {typeof p.bathrooms === "number" ? `${p.bathrooms} bains` : "— bains"}
                </p>
                <p className="min-h-[1.25rem] text-sm text-neutral-500">
                  {p.depositMonths ? `Caution : ${p.depositMonths} mois` : "Caution non renseignée"}
                </p>
                <div className="flex items-center justify-between pt-0.5">
                  <p className="text-base font-semibold">
                    {formatPrice(p.price)} FCFA
                    <span className="text-sm font-normal text-neutral-500">
                      {" "}
                      / {p.pricePeriod}
                    </span>
                  </p>
                </div>
              </div>
            </Link>
          ))}
          {canShowMore && (
            <div className="col-span-full flex justify-center pt-2">
              <button
                type="button"
                onClick={handleShowMore}
                disabled={isShowingMore}
                className="inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(15,23,42,0.18)] transition hover:bg-neutral-800 disabled:cursor-wait disabled:bg-neutral-800"
              >
                {isShowingMore ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/35 border-t-white motion-safe:animate-spin" />
                    Chargement
                  </>
                ) : (
                  "Voir plus"
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


