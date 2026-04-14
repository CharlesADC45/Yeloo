"use client";

import { BottomNav } from "@/components/BottomNav";
import { PropertyGrid } from "@/components/PropertyGrid";
import { PropertyGridSkeleton, SectionHeaderSkeleton } from "@/components/Skeleton";
import { TopBar } from "@/components/TopBar";
import { useProperties } from "@/hooks/useProperties";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { motion } from "framer-motion";
import Link from "next/link";
import { FiHeart } from "react-icons/fi";

export default function FavorisPage() {
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const { properties, isLoading, error } = useProperties();
  const favorites = properties.filter((property) => favoriteIds.includes(property.id));

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <main className="flex-1 px-6 pb-32 pt-32 sm:px-10 lg:px-16">
        {isLoading ? (
          <div className="mt-1">
            <SectionHeaderSkeleton />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-wrap items-baseline justify-between gap-4"
          >
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Favoris
            </h1>
            <p className="text-sm text-neutral-500">
              {`${favorites.length} logement(s)`}
            </p>
          </motion.div>
        )}

        {isLoading && (
          <div className="mt-8">
            <PropertyGridSkeleton count={10} />
          </div>
        )}

        {!isLoading && error && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-center shadow-soft"
          >
            <p className="text-sm text-red-700">{error}</p>
          </motion.section>
        )}

        {!isLoading && !error && favorites.length === 0 ? (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-soft"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600">
              <FiHeart />
            </div>
            <h2 className="mt-4 text-sm font-semibold">
              Aucun logement dans vos favoris
            </h2>
            <p className="mt-1 text-xs text-neutral-600">
              Ajoutez des logements en cliquant sur le cœur.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Explorer
            </Link>
          </motion.section>
        ) : null}

        {!isLoading && !error && favorites.length > 0 ? (
            <div className="mt-8">
              <PropertyGrid
                showHeader={false}
                filters={{
                city: "",
                neighborhood: "",
                minPrice: "",
                maxPrice: "",
                propertyType: "",
              }}
              properties={favorites}
              isLoading={false}
              error={null}
            />
          </div>
        ) : null}
      </main>
      <BottomNav />
    </div>
  );
}

