"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiEye, FiFileText, FiPauseCircle, FiPlayCircle } from "react-icons/fi";
import { AdminDashboardSkeleton } from "@/components/Skeleton";
import {
  type AdminPropertySummary,
  fetchAdminProperties,
  updateAdminPropertyStatus,
} from "@/lib/admin";
import { useAuthStore } from "@/stores/authStore";

const statusFilters = [
  { key: "all", label: "Toutes" },
  { key: "published", label: "PubliÃ©es" },
  { key: "draft", label: "Brouillons" },
  { key: "suspendu", label: "Suspendues" },
];

export default function AdminPublicationsPage() {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState("all");
  const [properties, setProperties] = useState<AdminPropertySummary[]>([]);
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
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les publications.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [status, token]);

  const counts = useMemo(
    () => ({
      total: properties.length,
      published: properties.filter((item) => item.status === "published").length,
      suspended: properties.filter((item) => item.status === "suspendu").length,
    }),
    [properties]
  );

  const setPropertyStatus = async (propertyId: string, nextStatus: string) => {
    if (!token) return;
    setPendingPropertyId(propertyId);
    try {
      const updated = await updateAdminPropertyStatus(token, propertyId, nextStatus);
      setProperties((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise Ã  jour impossible.");
    } finally {
      setPendingPropertyId(null);
    }
  };

  return (
    <main className="mx-auto w-full px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-6"
      >
        <div className="rounded-[2rem] bg-white p-6 shadow-soft">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <FiFileText />
            Publications
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900">
            ModÃ©ration des annonces
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            ContrÃ´le les biens publiÃ©s, repasse un bien en brouillon ou suspends-le.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">AffichÃ©es</p>
            <p className="mt-3 text-3xl font-semibold text-neutral-900">{counts.total}</p>
          </div>
          <div className="rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">PubliÃ©es</p>
            <p className="mt-3 text-3xl font-semibold text-neutral-900">{counts.published}</p>
          </div>
          <div className="rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Suspendues</p>
            <p className="mt-3 text-3xl font-semibold text-neutral-900">{counts.suspended}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatus(filter.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                status === filter.key
                  ? "bg-blue-600 text-white"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <AdminDashboardSkeleton />
        ) : (
          <section className="rounded-[2rem] border border-neutral-200 bg-white p-4 shadow-soft sm:p-6">
            <div className="space-y-3">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-[1.4rem] border border-neutral-200 bg-neutral-50 p-4"
                >
                  <div>
                    <p className="font-semibold text-neutral-900">{property.title}</p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {[property.city, property.neighborhood].filter(Boolean).join(" Â· ")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-neutral-900">
                      {property.price.toLocaleString("fr-FR")} FCFA / {property.price_period}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {property.deposit_months ? `Caution : ${property.deposit_months} mois` : "Caution non renseignÃ©e"}
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-400">
                      {property.owner_name || "PropriÃ©taire inconnu"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
                      {property.status}
                    </span>
                    {property.status !== "published" && (
                      <button
                        type="button"
                        onClick={() => void setPropertyStatus(property.id, "published")}
                        disabled={pendingPropertyId === property.id}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        <span className="inline-flex items-center gap-2">
                          <FiPlayCircle />
                          Publier
                        </span>
                      </button>
                    )}
                    {property.status !== "draft" && (
                      <button
                        type="button"
                        onClick={() => void setPropertyStatus(property.id, "draft")}
                        disabled={pendingPropertyId === property.id}
                        className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                      >
                        <span className="inline-flex items-center gap-2">
                          <FiEye />
                          Brouillon
                        </span>
                      </button>
                    )}
                    {property.status !== "suspendu" && (
                      <button
                        type="button"
                        onClick={() => void setPropertyStatus(property.id, "suspendu")}
                        disabled={pendingPropertyId === property.id}
                        className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        <span className="inline-flex items-center gap-2">
                          <FiPauseCircle />
                          Suspendre
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {error && (
              <div className="mt-4 rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </section>
        )}
      </motion.section>
    </main>
  );
}

