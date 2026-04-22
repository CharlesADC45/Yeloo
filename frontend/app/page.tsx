"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiCheckCircle, FiChevronRight, FiHeart } from "react-icons/fi";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { HeroSearch } from "@/components/HeroSearch";
import { PublicAnnouncementCarousel } from "@/components/PublicAnnouncementCarousel";
import { PropertyCarouselSkeleton, SectionHeaderSkeleton } from "@/components/Skeleton";
import { useProperties } from "@/hooks/useProperties";
import { applyPropertyFilters } from "@/lib/properties";
import type { Property, PropertyFilters } from "@/lib/properties";
import { useFavoritesStore } from "@/stores/favoritesStore";

const DEFAULT_FILTERS: PropertyFilters = {
  city: "",
  neighborhood: "",
  minPrice: "",
  maxPrice: "",
  propertyType: "",
};

function HomePageContent() {
  const router = useRouter();
  const [filters, setFilters] = useState<PropertyFilters>(DEFAULT_FILTERS);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCompactSearch, setIsCompactSearch] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSearchEngaged, setIsSearchEngaged] = useState(false);
  const { properties, isLoading, error, refetch } = useProperties();
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const recentSectionRef = useRef<HTMLElement | null>(null);
  const popularSectionRef = useRef<HTMLElement | null>(null);
  const locationsSectionRef = useRef<HTMLElement | null>(null);
  const homeRootRef = useRef<HTMLDivElement | null>(null);

  const visibleProperties = useMemo(
    () => applyPropertyFilters(properties, filters),
    [properties, filters]
  );
  const recentlyViewed = visibleProperties.slice(0, 8);
  const popular = visibleProperties.slice(0, 12);
  const popularLocations = useMemo(() => {
    const grouped = new Map<
      string,
      {
        city: string;
        count: number;
        imageUrl: string;
      }
    >();

    visibleProperties.forEach((property) => {
      const city = property.city?.trim();
      if (!city) return;

      const existing = grouped.get(city);
      if (existing) {
        existing.count += 1;
        return;
      }

      grouped.set(city, {
        city,
        count: 1,
        imageUrl: property.imageUrl,
      });
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city))
      .slice(0, 3);
  }, [visibleProperties]);
  const showFilterButton =
    isSearchEngaged || Boolean(filters.city.trim()) || isSearchOpen;
  const compactInHeader = isCompactSearch && isDesktop;
  const activeLocation = filters.city.trim() || "Abidjan";

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    const handleScroll = () => {
      setIsCompactSearch(window.scrollY > 36);
    };

    handleResize();
    handleScroll();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const sections = [
      recentSectionRef.current,
      popularSectionRef.current,
      locationsSectionRef.current,
    ].filter(Boolean);

    if (!sections.length) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        sections,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.62,
          stagger: 0.1,
          ease: "power3.out",
          clearProps: "transform",
        }
      );
    }, homeRootRef);

    return () => {
      context.revert();
    };
  }, [isLoading]);

  const handleQuickSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFilters((prev) => ({ ...prev, city: value }));
    if (value.trim()) {
      setIsSearchEngaged(true);
    }
  };

  const buildLogementsHref = (city?: string) => {
    const params = new URLSearchParams();
    const normalizedCity = city?.trim();
    if (normalizedCity) {
      params.set("city", normalizedCity);
    }
    return params.toString() ? `/logements?${params.toString()}` : "/logements";
  };

  const handleSearchSubmit = () => {
    router.push(buildLogementsHref(filters.city));
  };

  const renderCarousel = (
    items: Property[],
    options?: {
      cardWidth?: string;
      imageHeight?: string;
      compactMeta?: boolean;
    }
  ) => (
    <div className="hide-scrollbar mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
      {items.map((property) => (
        <Link
          key={property.id}
          href={`/logements/${property.id}`}
          className={`flex-shrink-0 snap-start ${
            options?.cardWidth ?? "w-[260px] sm:w-[300px] lg:w-[340px]"
          }`}
        >
          <article className="group rounded-[1.9rem]">
            <div
              className={`relative w-full overflow-hidden rounded-3xl ${
                options?.imageHeight ?? "h-72 sm:h-80 lg:h-[420px]"
              }`}
            >
              <img
                src={property.imageUrl}
                alt={property.title}
                onError={(event) => {
                  event.currentTarget.src = "/property-fallback.svg";
                }}
                className="h-full w-full object-cover"
              />
              {property.promoLabel && (
                <span className="absolute left-3 top-3 rounded-full bg-blue-700 px-3 py-1 text-[11px] font-semibold text-white shadow-soft">
                  {property.promoLabel}
                </span>
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toggleFavorite(property.id);
                }}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-soft transition-transform duration-200 hover:scale-110"
                aria-label="Ajouter aux favoris"
              >
                <FiHeart
                  className={`text-lg ${
                    favoriteIds.includes(property.id) ? "fill-blue-600 text-blue-600" : ""
                  }`}
                />
              </button>
              {property.badgeLabel && (
                <span className={`absolute left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-neutral-700 shadow-soft ${
                  property.promoLabel ? "top-11" : "top-3"
                }`}>
                  {property.badgeLabel}
                </span>
              )}
              {property.ownerIsVerified && (
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white/95 px-3 py-1 text-[11px] font-semibold text-blue-700 shadow-soft">
                  <FiCheckCircle className="text-sm text-blue-600" />
                  Propriétaire vérifié
                </span>
              )}
            </div>
              <div className={`mt-3 ${options?.compactMeta ? "space-y-0.5" : "space-y-1"} text-sm`}>
              <p className="line-clamp-2 font-semibold leading-tight text-neutral-900">
                {property.title}
              </p>
              <p className="text-xs text-neutral-600">
                {property.propertyType ? `${property.propertyType} · ` : ""}
                {property.city}
              </p>
              <p className="text-xs text-neutral-500">
                {typeof property.rooms === "number" ? `${property.rooms} lits` : "— lits"} • {" "}
                {property.price.toLocaleString("fr-FR")} FCFA
              </p>
            </div>
          </article>
        </Link>
      ))}
    </div>
  );

  return (
    <div
      ref={homeRootRef}
      className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#f8fafc_0%,#f3f8ff_44%,#f8fafc_100%)]"
    >
      <TopBar
        homeTitle="Commence ta recherche."
        homeSubtitle="Explore les logements populaires à Abidjan et dans toute la Côte d'Ivoire."
        homeSearch={{
          compact: compactInHeader,
          value: filters.city,
          showFilterButton,
          onChange: handleQuickSearch,
          onSubmit: handleSearchSubmit,
          onFocus: () => setIsSearchEngaged(true),
          onBlur: () => {
            if (!filters.city.trim()) {
              setIsSearchEngaged(false);
            }
          },
          onOpenFilters: () => {
            setIsSearchEngaged(true);
            setIsSearchOpen(true);
          },
        }}
      />

      <main className="flex-1 px-6 pb-32 pt-[15.5rem] sm:px-10 sm:pt-[16.5rem] lg:px-16">
        <PublicAnnouncementCarousel />

        <section ref={recentSectionRef} className="mt-8">
          {isLoading ? (
            <SectionHeaderSkeleton />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <h2 className="min-w-0 text-lg font-semibold sm:text-xl">
                Annonces consultées récemment
              </h2>
              <Link
                href={buildLogementsHref(filters.city)}
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-neutral-600 hover:text-neutral-900"
              >
                Voir tout <FiChevronRight />
              </Link>
            </div>
          )}
          {isLoading && (
            <PropertyCarouselSkeleton count={4} />
          )}
          {!isLoading && error && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={refetch}
                className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                Réessayer
              </button>
            </div>
          )}
          {!isLoading && !error && renderCarousel(recentlyViewed)}
        </section>

        <section ref={popularSectionRef} className="mt-10">
          {isLoading ? (
            <SectionHeaderSkeleton />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <h2 className="min-w-0 text-lg font-semibold sm:text-xl">
                Logements populaires · {activeLocation}
              </h2>
              <Link
                href={buildLogementsHref(activeLocation)}
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-neutral-600 hover:text-neutral-900"
              >
                Voir tout <FiChevronRight />
              </Link>
            </div>
          )}
          {!isLoading &&
            !error &&
            renderCarousel(popular, {
              cardWidth: "w-[220px] sm:w-[240px] lg:w-[260px]",
              imageHeight: "h-56 sm:h-60 lg:h-64",
              compactMeta: true,
            })}
          {isLoading && <PropertyCarouselSkeleton count={5} compact />}
        </section>

        {!isLoading && !error && popularLocations.length > 0 && (
          <section ref={locationsSectionRef} className="mt-12">
            <div className="flex items-center justify-between gap-3">
              <h2 className="min-w-0 text-lg font-semibold sm:text-xl">Popular locations</h2>
              <Link
                href={buildLogementsHref(filters.city)}
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-neutral-600 hover:text-neutral-900"
              >
                Voir tout <FiChevronRight />
              </Link>
            </div>

            <div className="hide-scrollbar mt-5 flex snap-x snap-proximity scroll-smooth gap-4 overflow-x-auto overscroll-x-contain pb-2 pr-2 [scroll-padding-left:1rem] [scroll-padding-right:1rem] md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:pr-0 md:[scroll-padding-left:0] md:[scroll-padding-right:0]">
              {popularLocations.map((location) => (
                <Link
                  key={location.city}
                  href={buildLogementsHref(location.city)}
                  className="group block w-[320px] flex-shrink-0 snap-center overflow-hidden rounded-[2rem] first:ml-0 sm:w-[340px] md:w-auto md:snap-start"
                >
                  <article className="relative h-56 overflow-hidden rounded-[2rem] sm:h-64">
                    <img
                      src={location.imageUrl}
                      alt={location.city}
                      onError={(event) => {
                        event.currentTarget.src = "/property-fallback.svg";
                      }}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white">
                      <div>
                        <p className="text-2xl font-semibold tracking-tight">
                          {location.city}
                        </p>
                        <p className="mt-1 text-sm text-white/85">
                          {location.count} logement{location.count > 1 ? "s" : ""} disponible
                          {location.count > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                        Explorer
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <HeroSearch
        filters={filters}
        onChange={setFilters}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={handleSearchSubmit}
      />

      <BottomNav />
    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
