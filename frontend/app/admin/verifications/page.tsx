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
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchAdminOwnerKyc(token, status === "all" ? undefined : status);
        if (!active) return;
        setProfiles(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les dossiers KYC.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
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
    <main className="mx-auto w-full px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
        <div className="rounded-[2rem] bg-white p-6 shadow-soft">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <FiShield />
            Vérifications KYC
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900">
            Revue propriétaire
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Validez les dossiers propriétaires, comparez selfie, pièce d’identité et justificatif, puis approuvez ou refusez.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Dossiers affichés</p>
            <p className="mt-3 text-3xl font-semibold text-neutral-900">{counts.total}</p>
          </div>
          <div className="rounded-[1.6rem] border border-neutral-200 bg-white p-5 shadow-soft">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">En cours</p>
            <p className="mt-3 text-3xl font-semibold text-neutral-900">{counts.pending}</p>
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
            <div className="space-y-4">
              {profiles.map((profile) => (
                <div key={profile.id} className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-900">{profile.full_name || profile.email}</p>
                      <p className="mt-1 text-sm text-neutral-600">
                        {profile.email} • {profile.phone || "Téléphone non renseigné"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full bg-white px-2.5 py-1 text-neutral-600">{profile.city}</span>
                        <span className={`rounded-full px-2.5 py-1 ${
                          profile.verification_status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : profile.verification_status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}>
                          {profile.verification_status}
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-2 text-xs text-neutral-600 sm:text-right">
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
                    placeholder="Note admin / motif éventuel…"
                    className="mt-4 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDecision(profile.id, "approved")}
                      disabled={pendingId === profile.id}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                    >
                      <FiUserCheck />
                      Approuver
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDecision(profile.id, "rejected")}
                      disabled={pendingId === profile.id}
                      className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
                    >
                      <FiXCircle />
                      Refuser
                    </button>
                    {profile.reviewed_at && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs text-neutral-500">
                        <FiCheckCircle />
                        Revérifié le {new Date(profile.reviewed_at).toLocaleString("fr-FR")}
                      </span>
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
