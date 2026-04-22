import Link from "next/link";
import { motion } from "framer-motion";
import { FiCheckCircle, FiHeart } from "react-icons/fi";
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
}: Props) {
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);

  const filtered = applyPropertyFilters(properties, filters);
  const showEmpty = !isLoading && !error && filtered.length === 0;

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
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/logements/${p.id}`}
              className="group flex h-full flex-col overflow-hidden rounded-[1.7rem] border border-white/80 bg-white/90 backdrop-blur-sm transition"
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
                {p.isVerified && (
                  <div
                    className={`absolute left-3 ${
                      p.promoLabel && p.availabilityStatus !== "available"
                        ? "top-[4.75rem]"
                        : p.promoLabel || p.availabilityStatus !== "available"
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
              <div className="flex flex-1 flex-col px-1 pt-3">
                <div className="flex min-h-[3.5rem] items-start justify-between gap-2">
                  <h3 className="line-clamp-2 min-h-[3.5rem] text-base font-semibold leading-tight text-neutral-900">
                    {p.title}
                  </h3>
                  <span className="shrink-0 text-sm font-semibold text-neutral-800">
                    ★ 5,0
                  </span>
                </div>
                <p className="line-clamp-1 min-h-[1.25rem] text-sm text-neutral-600">
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
                    {p.price.toLocaleString("fr-FR")} FCFA
                    <span className="text-sm font-normal text-neutral-500">
                      {" "}
                      / {p.pricePeriod}
                    </span>
                  </p>
                </div>
                <div className="mt-auto flex min-h-[2.25rem] flex-wrap items-center gap-2 pt-2">
                  {p.ownerIsVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                      <FiCheckCircle className="text-xs text-blue-600" />
                      Propriétaire vérifié
                    </span>
                  )}
                  {p.badgeLabel && (
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-700">
                      {p.badgeLabel}
                    </span>
                  )}
                  {p.availabilityStatus === "available" && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                      {p.availabilityLabel}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


