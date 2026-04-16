"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiCheckCircle, FiShield, FiUserCheck, FiXCircle } from "react-icons/fi";
import { AdminDashboardSkeleton } from "@/components/Skeleton";
import {
  type AdminOwnerKycSummary,
  fetchAdminOwnerKyc,
  reviewAdminOwnerKyc,
} from "@/lib/admin";
import { useAuthStore } from "@/stores/authStore";

const statusFilters = [
  { key: "all", label: "Tous" },
  { key: "pending_review", label: "En cours" },
  { key: "approved", label: "Approuvés" },
  { key: "rejected", label: "Refusés" },
];

export default function AdminVerificationsPage() {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState("pending_review");
  const [profiles, setProfiles] = useState<AdminOwnerKycSummary[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const data = await fetchAdminOwnerKyc(token, status === "all" ? undefined : status);
        if (!active) return;
        setProfiles(data);
      } catch (err) {
        if (!active) return;
        if (!silent) {
          setError(err instanceof Error ? err.message : "Impossible de charger les dossiers KYC.");
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
      total: profiles.length,
      pending: profiles.filter((item) => item.verification_status === "pending_review").length,
      approved: profiles.filter((item) => item.verification_status === "approved").length,
    }),
    [profiles]
  );

  const handleDecision = async (profileId: string, decision: "approved" | "rejected") => {
    if (!token) return;
    setPendingId(profileId);
    setError(null);
    try {
      const updated = await reviewAdminOwnerKyc(token, profileId, decision, notesById[profileId]);
      setProfiles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour ce dossier.");
    } finally {
      setPendingId(null);
    }
  };

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
            <FiShield />
            Vérifications KYC
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
            Revue propriétaire
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
            Validez les dossiers propriétaires, comparez selfie, pièce d'identité et justificatif, puis approuvez ou refusez.
          </p>
        </section>

        <section className="grid max-w-4xl grid-cols-3 text-center">
          {[
            ["Dossiers affichés", counts.total],
            ["En cours", counts.pending],
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
          <section className="max-w-6xl">
            <div className="divide-y divide-neutral-100">
              {profiles.map((profile) => (
                <article key={profile.id} className="py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-950">{profile.full_name || profile.email}</p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {profile.email} · {profile.phone || "Téléphone non renseigné"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">
                          {profile.city}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 ${
                            profile.verification_status === "approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : profile.verification_status === "rejected"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {profile.verification_status}
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-2 text-xs text-neutral-500 sm:text-right">
                      <span>ID : {profile.identity_doc_name || "manquant"}</span>
                      <span>Selfie : {profile.identity_selfie_name || "manquant"}</span>
                      <span>Justificatif : {profile.property_proof_name || "manquant"}</span>
                    </div>
                  </div>

                  <textarea
                    value={notesById[profile.id] ?? profile.verification_notes ?? ""}
                    onChange={(event) =>
                      setNotesById((current) => ({ ...current, [profile.id]: event.target.value }))
                    }
                    rows={3}
                    placeholder="Note admin / motif éventuel..."
                    className="mt-4 w-full rounded-[1.25rem] bg-neutral-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDecision(profile.id, "approved")}
                      disabled={pendingId === profile.id}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                    >
                      <FiUserCheck />
                      Approuver
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDecision(profile.id, "rejected")}
                      disabled={pendingId === profile.id}
                      className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                    >
                      <FiXCircle />
                      Refuser
                    </button>
                    {profile.reviewed_at && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-2 text-xs text-neutral-500">
                        <FiCheckCircle />
                        Revérifié le {new Date(profile.reviewed_at).toLocaleString("fr-FR")}
                      </span>
                    )}
                  </div>
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
