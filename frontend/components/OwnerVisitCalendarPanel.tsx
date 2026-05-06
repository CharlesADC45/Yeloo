"use client";

import Link from "next/link";
import { FiCalendar, FiCheckCircle, FiChevronRight, FiClock, FiXCircle } from "react-icons/fi";
import type { VisitRequest } from "@/lib/visitRequests";

type OwnerVisitCalendarPanelProps = {
  visitRequests: VisitRequest[];
  pendingVisitCount: number;
  visitActionId: string | null;
  rescheduleDates: Record<string, string>;
  setRescheduleDates: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onVisitAction: (
    visitRequest: VisitRequest,
    status: "accepted" | "declined" | "rescheduled"
  ) => Promise<void> | void;
  limit?: number;
  showCalendarLink?: boolean;
};

function formatVisitDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getVisitStatusLabel(status: VisitRequest["status"]) {
  switch (status) {
    case "accepted":
      return "acceptée";
    case "declined":
      return "refusée";
    case "rescheduled":
      return "autre date proposée";
    case "cancelled":
      return "annulée";
    default:
      return "en attente";
  }
}

function getDateBadgeParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { weekday: "--", day: "--", month: "--" };
  }

  return {
    weekday: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date).replace(".", ""),
    day: new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(date).replace(".", ""),
  };
}

export function OwnerVisitCalendarPanel({
  visitRequests,
  pendingVisitCount,
  visitActionId,
  rescheduleDates,
  setRescheduleDates,
  onVisitAction,
  limit,
  showCalendarLink = false,
}: OwnerVisitCalendarPanelProps) {
  const items = typeof limit === "number" ? visitRequests.slice(0, limit) : visitRequests;

  return (
    <section className="rounded-[1.8rem] border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-950 sm:text-lg">Calendrier des visites</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Acceptez une visite, refusez-la ou proposez un autre créneau.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
            {pendingVisitCount} en attente
          </span>
          <span className="rounded-full border border-neutral-200 px-3 py-1 text-neutral-500">
            {visitRequests.length} demande(s)
          </span>
          {showCalendarLink && (
            <Link
              href="/proprietaire/calendrier"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1 text-neutral-700"
            >
              Tout voir
              <FiChevronRight />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-[1.4rem] bg-neutral-50 px-4 py-5 text-sm text-neutral-600">
            Aucune demande de visite pour le moment.
          </div>
        ) : (
          items.map((item) => {
            const badge = getDateBadgeParts(item.proposed_at || item.preferred_at);
            return (
              <article
                key={item.id}
                className="rounded-[1.5rem] border border-neutral-200 bg-white p-4 transition hover:border-blue-100 hover:bg-blue-50/40"
              >
                <div className="flex items-start gap-4">
                  <div className="flex w-[5.4rem] shrink-0 flex-col items-center rounded-[1.35rem] border border-blue-100 bg-blue-50 px-2 py-3 text-blue-700">
                    <span className="text-[11px] font-semibold uppercase tracking-wide">
                      {badge.weekday}
                    </span>
                    <span className="mt-1 text-2xl font-semibold leading-none">{badge.day}</span>
                    <span className="mt-1 text-[11px] font-medium uppercase tracking-wide">
                      {badge.month}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-neutral-950">
                          {item.property_title}
                        </p>
                        <p className="mt-1 text-sm text-neutral-500">
                          {item.tenant_full_name} · {item.property_neighborhood || item.property_city}
                        </p>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                        {getVisitStatusLabel(item.status)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-700">
                      <span className="inline-flex items-center gap-2 rounded-full bg-neutral-50 px-3 py-2">
                        <FiCalendar className="text-neutral-400" />
                        Souhaitée le {formatVisitDate(item.preferred_at)}
                      </span>
                      {item.proposed_at && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-blue-700">
                          <FiClock />
                          Nouvelle date {formatVisitDate(item.proposed_at)}
                        </span>
                      )}
                    </div>

                    {item.message && (
                      <p className="mt-3 rounded-[1.2rem] bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-600">
                        {item.message}
                      </p>
                    )}

                    {item.status === "pending" && (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-[1.2rem] border border-blue-100 bg-blue-50/50 p-3">
                          <label className="block text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                            Proposer une nouvelle date
                          </label>
                          <input
                            type="datetime-local"
                            value={rescheduleDates[item.id] || ""}
                            onChange={(event) =>
                              setRescheduleDates((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                            aria-label="Nouvelle date de visite"
                          />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={() => void onVisitAction(item, "accepted")}
                            disabled={visitActionId === `${item.id}:accepted`}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            <FiCheckCircle />
                            Accepter
                          </button>
                          <button
                            type="button"
                            onClick={() => void onVisitAction(item, "declined")}
                            disabled={visitActionId === `${item.id}:declined`}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-60"
                          >
                            <FiXCircle />
                            Refuser
                          </button>
                          <button
                            type="button"
                            onClick={() => void onVisitAction(item, "rescheduled")}
                            disabled={visitActionId === `${item.id}:rescheduled`}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-100 px-4 py-3 text-sm font-semibold text-blue-700 disabled:opacity-60"
                          >
                            <FiClock />
                            Proposer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
