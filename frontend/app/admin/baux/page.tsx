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
    const load = async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const data = await fetchAdminLeaseRequests(token, status === "all" ? undefined : status);
        if (!active) return;
        setItems(data);
      } catch (err) {
        if (!active) return;
        if (!silent) {
          setError(err instanceof Error ? err.message : "Impossible de charger les baux.");
        }
      } finally {
        if (active && !silent) setIsLoading(false);
      }
    };
    void load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 20000);
    return () => {
      active = false;
      window.clearInterval(interval);
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
    <main className="mx-auto w-full bg-white px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-7"
      >
        <section className="max-w-4xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
            <FiFileText />
            Baux
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
            Dossiers de bail
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
            Suis toutes les demandes de bail remontées par les locataires et validées par les propriétaires.
          </p>
        </section>

        <section className="grid max-w-4xl grid-cols-3 text-center">
          {[
            ["Dossiers", counts.total],
            ["En attente", counts.submitted],
            ["Approuvés", counts.approved],
          ].map(([label, value]) => (
            <div key={label} className="py-3">
              <p className="text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                {label}
              </p>
            </div>
          ))}
        </section>

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

        {isLoading ? (
          <AdminDashboardSkeleton />
        ) : (
          <section className="max-w-5xl">
            <div className="divide-y divide-neutral-100">
              {items.map((item) => (
                <article key={item.id} className="py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-950">{item.property_title}</p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {item.tenant_full_name} · {item.tenant_email}
                      </p>
                      <p className="mt-2 text-xs text-neutral-400">{item.property_city}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        item.status === "approved"
                          ? "bg-emerald-50 text-emerald-700"
                          : item.status === "rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-blue-50 text-blue-700"
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
                  <p className="mt-3 text-xs text-neutral-400">
                    Créé le {new Date(item.created_at).toLocaleString("fr-FR")}
                  </p>
                </article>
              ))}
            </div>
            {error && (
              <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </section>
        )}
      </motion.section>
    </main>
  );
}
