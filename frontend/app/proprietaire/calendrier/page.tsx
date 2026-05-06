"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { OwnerVisitCalendarPanel } from "@/components/OwnerVisitCalendarPanel";
import { OwnerDashboardSkeleton } from "@/components/Skeleton";
import { TopBar } from "@/components/TopBar";
import {
  listOwnerVisitRequests,
  updateVisitRequestStatus,
  type VisitRequest,
} from "@/lib/visitRequests";
import { useAuthStore } from "@/stores/authStore";

export default function ProprietaireCalendrierPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visitActionId, setVisitActionId] = useState<string | null>(null);
  const [rescheduleDates, setRescheduleDates] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    listOwnerVisitRequests(token)
      .then((items) => {
        if (!active) return;
        setVisitRequests(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Chargement du calendrier impossible.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, token]);

  const pendingVisitCount = useMemo(
    () => visitRequests.filter((item) => item.status === "pending").length,
    [visitRequests]
  );
  const acceptedCount = useMemo(
    () => visitRequests.filter((item) => item.status === "accepted").length,
    [visitRequests]
  );
  const rescheduledCount = useMemo(
    () => visitRequests.filter((item) => item.status === "rescheduled").length,
    [visitRequests]
  );

  const handleVisitAction = async (
    visitRequest: VisitRequest,
    status: "accepted" | "declined" | "rescheduled"
  ) => {
    if (!token) return;
    const proposedDate = rescheduleDates[visitRequest.id];
    if (status === "rescheduled" && !proposedDate) {
      setError("Choisissez une nouvelle date avant de proposer un autre créneau.");
      return;
    }

    setVisitActionId(`${visitRequest.id}:${status}`);
    setError(null);
    try {
      const updated = await updateVisitRequestStatus(visitRequest.id, token, {
        status,
        proposed_at: status === "rescheduled" ? new Date(proposedDate).toISOString() : undefined,
        owner_message:
          status === "accepted"
            ? "La visite est confirmée. Merci de rester disponible à l'heure prévue."
            : status === "declined"
              ? "Le propriétaire n'est pas disponible pour cette visite."
              : "Le propriétaire propose un autre horaire pour la visite.",
      });
      setVisitRequests((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour de la visite impossible.");
    } finally {
      setVisitActionId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto max-w-md px-4 pb-28 pt-24">
          <section className="rounded-3xl border border-neutral-100 bg-white p-6 text-center">
            <h1 className="text-lg font-semibold">Calendrier propriétaire</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Connectez-vous pour gérer les demandes de visite.
            </p>
            <Link
              href="/connexion"
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Aller à la connexion
            </Link>
          </section>
        </main>
      </div>
    );
  }

  if (user?.role !== "proprietaire" && user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto max-w-md px-4 pb-28 pt-24">
          <section className="rounded-3xl border border-neutral-100 bg-white p-6 text-center">
            <h1 className="text-lg font-semibold">Accès refusé</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Cette page est réservée à l’espace propriétaire.
            </p>
            <Link href="/proprietaire" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
              Retour au dashboard
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <OwnerSidebar />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
        {isLoading ? (
          <section className="rounded-3xl bg-white p-6">
            <OwnerDashboardSkeleton />
          </section>
        ) : (
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-neutral-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                    Propriétaire
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
                    Calendrier des visites
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-neutral-500">
                    Retrouvez toutes les demandes, confirmez les créneaux et proposez de nouvelles disponibilités.
                  </p>
                </div>
                <Link
                  href="/proprietaire"
                  className="inline-flex rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700"
                >
                  Retour au dashboard
                </Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Demandes totales", value: `${visitRequests.length}` },
                  { label: "En attente", value: `${pendingVisitCount}` },
                  { label: "Acceptées / replanifiées", value: `${acceptedCount + rescheduledCount}` },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.4rem] border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-neutral-950">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-[1.6rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <OwnerVisitCalendarPanel
              visitRequests={visitRequests}
              pendingVisitCount={pendingVisitCount}
              visitActionId={visitActionId}
              rescheduleDates={rescheduleDates}
              setRescheduleDates={setRescheduleDates}
              onVisitAction={handleVisitAction}
            />
          </section>
        )}
      </main>
    </div>
  );
}
