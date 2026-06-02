"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FiArrowLeft, FiArrowUp, FiChevronRight, FiMapPin } from "react-icons/fi";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { PropertyGrid } from "@/components/PropertyGrid";
import { useProperties } from "@/hooks/useProperties";
import { applyPropertyFilters } from "@/lib/properties";
import type { PropertyFilters } from "@/lib/properties";

const DEFAULT_FILTERS: PropertyFilters = {
  city: "",
  neighborhood: "",
  minPrice: "",
  maxPrice: "",
  propertyType: "",
};

function LogementsPageContent() {
  const searchParams = useSearchParams();
  const { properties, isLoading, error, refetch } = useProperties();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollTopTimerRef = useRef<number | null>(null);

  const filters = useMemo<PropertyFilters>(
    () => ({
      city: searchParams.get("city") || "",
      neighborhood: searchParams.get("neighborhood") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      propertyType: searchParams.get("propertyType") || "",
    }),
    [searchParams]
  );

  const filteredProperties = useMemo(
    () => applyPropertyFilters(properties, filters),
    [properties, filters]
  );

  const locationLabel =
    filters.city.trim() || filters.neighborhood.trim() || "Abidjan";
  const totalCount = isLoading ? null : filteredProperties.length;
  const popularLocations = useMemo(() => {
    const grouped = properties.reduce<Record<string, { count: number; imageUrl: string; minPrice: number }>>(
      (acc, property) => {
        const city = property.city?.trim();
        if (!city) return acc;
        if (!acc[city]) {
          acc[city] = {
            count: 0,
            imageUrl: property.imageUrl,
            minPrice: property.price,
          };
        }
        acc[city].count += 1;
        acc[city].minPrice = Math.min(acc[city].minPrice, property.price);
        if (!acc[city].imageUrl) {
          acc[city].imageUrl = property.imageUrl;
        }
        return acc;
      },
      {}
    );

    return Object.entries(grouped)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([city, data]) => ({
        city,
        count: data.count,
        imageUrl: data.imageUrl,
        minPrice: data.minPrice,
      }));
  }, [properties]);

  useEffect(() => {
    const handleScroll = () => {
      const shouldShow = window.scrollY > 260;
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

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTopTimerRef.current) {
        window.clearTimeout(scrollTopTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <TopBar />
      <main className="flex-1 px-6 pb-32 pt-32 sm:px-10 lg:px-16">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Link
              href="/"
              replace
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-800 shadow-sm transition hover:bg-neutral-50"
              aria-label="Retour"
            >
              <FiArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {locationLabel} : {totalCount === null ? "..." : `Plus de ${totalCount} logements`}
              </h1>
              <p className="mt-2 text-sm text-neutral-600 sm:text-base">
                Classement des résultats
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8">
          <PropertyGrid
            filters={filters}
            properties={properties}
            isLoading={isLoading}
            error={error}
            onRetry={refetch}
            showHeader={false}
            borderlessCards
            initialVisibleCount={10}
          />
        </div>

        {!isLoading && !error && popularLocations.length > 0 && (
          <section className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
                  Localisation Populaires
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Quelques zones populaires à explorer sans rallonger visuellement la grille.
                </p>
              </div>
            </div>

            <div className="hide-scrollbar mt-5 flex gap-4 overflow-x-auto pb-3">
              {popularLocations.map((item) => (
                <Link
                  key={item.city}
                  href={`/logements?city=${encodeURIComponent(item.city)}`}
                  className="group min-w-[min(280px,calc(100vw-3rem))] flex-1 overflow-hidden rounded-[1.8rem] border border-neutral-200 bg-white shadow-soft sm:min-w-[340px] lg:min-w-[380px]"
                >
                  <div className="relative h-48 overflow-hidden sm:h-56">
                    <img
                      src={item.imageUrl}
                      alt={item.city}
                      onError={(event) => {
                        event.currentTarget.src = "/property-fallback.svg";
                      }}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-neutral-800 shadow-soft">
                      <FiMapPin className="text-sm text-blue-600" />
                      {item.count} logement(s)
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="text-2xl font-semibold tracking-tight">{item.city}</p>
                      <p className="mt-1 text-sm text-white/85">
                        À partir de {item.minPrice.toLocaleString("en-US")} FCFA
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-5 py-4 text-sm text-neutral-700">
                    <span className="font-medium">Voir les biens de {item.city}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
                      Explorer <FiChevronRight />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 text-center text-xs text-neutral-500">
          <Link href="/" className="font-medium text-blue-600 hover:text-blue-800">
            Retour à l’accueil
          </Link>
        </div>
      </main>

      <BottomNav />
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-5 z-[80] flex h-12 w-12 items-center justify-center rounded-full bg-neutral-950 text-white shadow-[0_18px_36px_rgba(15,23,42,0.24)] transition hover:bg-neutral-800"
          aria-label="Remonter"
          title="Remonter"
        >
          <FiArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export default function LogementsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LogementsPageContent />
    </Suspense>
  );
}
