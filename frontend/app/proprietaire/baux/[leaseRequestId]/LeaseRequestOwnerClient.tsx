"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiMapPin,
  FiPhone,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { TopBar } from "@/components/TopBar";
import {
  type LeaseRequest,
  getLeaseRequestById,
  updateLeaseRequestStatus,
} from "@/lib/leaseRequests";
import { useAuthStore } from "@/stores/authStore";

type Props = {
  leaseRequestId: string;
};

function getStatusUi(status: LeaseRequest["status"]) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    case "submitted":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

export function LeaseRequestOwnerClient({ leaseRequestId }: Props) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isOwnerRole = user?.role === "proprietaire" || user?.role === "admin";
  const isVerifiedOwner = isOwnerRole && Boolean(user?.is_verified);

  const [leaseRequest, setLeaseRequest] = useState<LeaseRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (!isOwnerRole) {
      router.replace("/");
      return;
    }
    if (!isVerifiedOwner) {
      router.replace("/proprietaire/nouveau");
    }
  }, [isAuthenticated, isOwnerRole, isVerifiedOwner, router, user]);

  useEffect(() => {
    if (!token || !isVerifiedOwner) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getLeaseRequestById(leaseRequestId, token);
        if (!cancelled) {
          setLeaseRequest(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Impossible de charger ce dossier de bail."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isVerifiedOwner, leaseRequestId, token]);

  const location = useMemo(() => {
    if (!leaseRequest) return "-";
    return [
      leaseRequest.property_neighborhood,
      leaseRequest.property_city,
      leaseRequest.property_address,
    ]
      .filter(Boolean)
      .join(", ");
  }, [leaseRequest]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleReject = async () => {
    if (!token || !leaseRequest) return;
    setIsActing(true);
    setError(null);
    try {
      const updated = await updateLeaseRequestStatus(leaseRequest.id, "rejected", token);
      setLeaseRequest(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de refuser cette demande.");
    } finally {
      setIsActing(false);
    }
  };

  if (!isAuthenticated || (isAuthenticated && user && (!isOwnerRole || !isVerifiedOwner))) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <OwnerSidebar />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8 print:pt-8 print:pb-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft print:shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">
                  Dossier de bail
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
                  {leaseRequest?.property_title || "Demande de bail"}
                </h1>
                <p className="mt-2 text-sm text-neutral-600">
                  Le module de contrat reste visible ici pour le propriétaire pendant que nous reprenons le process.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                {leaseRequest && (
                  <span className={`rounded-full px-4 py-2 text-xs font-semibold ${getStatusUi(leaseRequest.status)}`}>
                    {leaseRequest.status}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 transition"
                >
                  <FiDownload />
                  Exporter / PDF
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
              <div className="animate-pulse space-y-4">
                <div className="h-8 w-56 rounded-full bg-neutral-100" />
                <div className="h-40 rounded-[1.5rem] bg-neutral-100" />
                <div className="h-72 rounded-[1.5rem] bg-neutral-100" />
              </div>
            </div>
          ) : error && !leaseRequest ? (
            <div className="rounded-[2rem] border border-red-200 bg-white p-6 shadow-soft">
              <p className="text-sm text-red-700">{error}</p>
              <Link href="/proprietaire" className="mt-4 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Retour au dashboard
              </Link>
            </div>
          ) : leaseRequest ? (
            <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr] print:block">
              <div className="space-y-6">
                <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft print:shadow-none">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Logement</p>
                      <p className="mt-3 text-lg font-semibold text-neutral-950">{leaseRequest.property_title}</p>
                      <div className="mt-3 space-y-2 text-sm text-neutral-600">
                        <p className="flex items-center gap-2"><FiMapPin className="text-neutral-400" />{location}</p>
                        <p className="flex items-center gap-2"><FiFileText className="text-neutral-400" />{leaseRequest.property_type} · {leaseRequest.property_price.toLocaleString("fr-FR")} FCFA / {leaseRequest.property_price_period}</p>
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Locataire</p>
                      <p className="mt-3 flex items-center gap-2 text-lg font-semibold text-neutral-950"><FiUser className="text-neutral-400" />{leaseRequest.tenant_full_name}</p>
                      <div className="mt-3 space-y-2 text-sm text-neutral-600">
                        <p>{leaseRequest.tenant_email}</p>
                        <p className="flex items-center gap-2"><FiPhone className="text-neutral-400" />{leaseRequest.tenant_phone || "Téléphone non renseigné"}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft print:shadow-none">
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-blue-600" />
                    <h2 className="text-lg font-semibold text-neutral-950">Contrat de bail</h2>
                  </div>
                  <div className="mt-4 whitespace-pre-wrap rounded-[1.2rem] bg-neutral-50 p-4 text-sm leading-7 text-neutral-700">
                    {leaseRequest.contract_text}
                  </div>
                </section>

                <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft print:shadow-none">
                  <h2 className="text-lg font-semibold text-neutral-950">Validation physique</h2>
                  <div className="mt-5 rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-sm leading-7 text-neutral-600">
                      La signature du bail se fait physiquement entre le propriétaire et le
                      locataire. Cette interface sert uniquement à classer le dossier après
                      vérification hors ligne.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                      <button
                        type="button"
                        disabled={isActing || leaseRequest.status === "approved"}
                        onClick={async () => {
                          if (!token || !leaseRequest) return;
                          setIsActing(true);
                          setError(null);
                          try {
                            const updated = await updateLeaseRequestStatus(leaseRequest.id, "approved", token);
                            setLeaseRequest(updated);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Impossible de valider cette demande.");
                          } finally {
                            setIsActing(false);
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FiCheckCircle />
                        Marquer comme validée
                      </button>
                      <button
                        type="button"
                        disabled={isActing || leaseRequest.status === "rejected"}
                        onClick={handleReject}
                        className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                </section>

                {error && leaseRequest && <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              </div>

              <aside className="space-y-6 print:hidden">
                <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
                  <div className="flex items-center gap-2 text-blue-700">
                    <FiShield />
                    <h2 className="text-lg font-semibold text-neutral-950">État du dossier</h2>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-neutral-600">
                    <div className="rounded-[1.2rem] border border-neutral-200 bg-neutral-50 p-4">
                      <p className="font-semibold text-neutral-900">Créé le</p>
                      <p className="mt-1">{new Date(leaseRequest.created_at).toLocaleString("fr-FR")}</p>
                    </div>
                    {leaseRequest.submitted_at && <div className="rounded-[1.2rem] border border-neutral-200 bg-neutral-50 p-4"><p className="font-semibold text-neutral-900">Soumis le</p><p className="mt-1">{new Date(leaseRequest.submitted_at).toLocaleString("fr-FR")}</p></div>}
                  </div>
                </section>

                <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
                  <h2 className="text-lg font-semibold text-neutral-950">Actions rapides</h2>
                  <div className="mt-4 space-y-3">
                    <Link href={`/logements/${leaseRequest.property_id}`} className="block rounded-[1.2rem] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-800 transition">Voir la fiche logement</Link>
                    <Link href="/proprietaire" className="block rounded-[1.2rem] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-800 transition">Retour au dashboard</Link>
                  </div>
                </section>
              </aside>
            </div>
          ) : null}
        </motion.section>
      </main>
    </div>
  );
}

