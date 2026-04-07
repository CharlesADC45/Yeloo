"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiCheckCircle, FiClock, FiFileText } from "react-icons/fi";
import { AdminDashboardSkeleton } from "@/components/Skeleton";
import { type AdminLeaseSummary, fetchAdminLeaseRequests } from "@/lib/admin";
import { useAuthStore } from "@/stores/authStore";

const statusFilters = [
  { key: "all", label: "Tous" },
  { key: "submitted", label: "En attente" },
  { key: "approved", label: "Approuvés" },
  { key: "rejected", label: "Refusés" },
];

export default function AdminBauxPage() {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState("all");
  const [items, setItems] = useState<AdminLeaseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchAdminLeaseRequests(token, status === "all" ? undefined : status);
        if (!active) return;
        setItems(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les baux.");
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
      total: items.length,
      submitted: items.filter((item) => item.status === "submitted").length,
      approved: items.filter((item) => item.status === "approved").length,
    }),
    [items]
  );

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
            Baux
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900">
            Dossiers de bail
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Suis toutes les demandes de bail remontées par les locataires et validées par les propriétaires.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Dossiers</p>
            <p className="mt-3 text-3xl font-semibold text-neutral-900">{counts.total}</p>
          </div>
          <div className="rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">En attente</p>
            <p className="mt-3 text-3xl font-semibold text-neutral-900">{counts.submitted}</p>
          </div>
          <div className="rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Approuvés</p>
            <p className="mt-3 text-3xl font-semibold text-neutral-900">{counts.approved}</p>
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
              {items.map((item) => (
                <div key={item.id} className="rounded-[1.4rem] border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-900">{item.property_title}</p>
                      <p className="mt-1 text-sm text-neutral-600">{item.tenant_full_name} · {item.tenant_email}</p>
                      <p className="mt-2 text-[11px] text-neutral-400">{item.property_city}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        item.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {item.status === "submitted" ? (
                        <span className="inline-flex items-center gap-1">
                          <FiClock />
                          En attente
                        </span>
                      ) : item.status === "approved" ? (
                        <span className="inline-flex items-center gap-1">
                          <FiCheckCircle />
                          Approuvé
                        </span>
                      ) : (
                        item.status
                      )}
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] text-neutral-400">
                    Créé le {new Date(item.created_at).toLocaleString("fr-FR")}
                  </p>
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
