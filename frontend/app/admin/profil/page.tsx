"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiMail,
  FiMessageCircle,
  FiPhone,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { fetchAdminDashboard, type AdminDashboard } from "@/lib/admin";
import { useAuthStore } from "@/stores/authStore";

function formatDate(value?: string | null) {
  if (!value) return "Session active";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Session active";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function AdminProfilPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;

    const load = async () => {
      try {
        const data = await fetchAdminDashboard(token);
        if (active) setDashboard(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Impossible de charger le profil.");
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [token]);

  const name = user?.full_name || "Super admin";
  const initials = useMemo(
    () =>
      name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [name]
  );

  const stats = [
    {
      label: "Utilisateurs",
      value: dashboard?.counts.total_users ?? 0,
      helper: "Comptes suivis",
      Icon: FiUsers,
    },
    {
      label: "Vérifications",
      value: dashboard?.counts.pending_owner_kyc ?? 0,
      helper: "En attente",
      Icon: FiClock,
    },
    {
      label: "Annonces",
      value: dashboard?.counts.total_properties ?? 0,
      helper: "Publications",
      Icon: FiActivity,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-24 lg:ml-72 lg:px-10">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="space-y-8"
      >
        <section className="overflow-hidden rounded-[2.3rem] bg-neutral-950 text-white">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.05fr_1.4fr] lg:p-10">
            <div className="flex items-start gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.7rem] bg-white text-2xl font-black text-neutral-950">
                {initials || "SA"}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
                  Profil admin
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  {name}
                </h1>
                <p className="mt-2 max-w-md text-sm leading-6 text-white/65">
                  Espace de pilotage pour valider les propriétaires, suivre les annonces et
                  garder la plateforme propre.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map(({ label, value, helper, Icon }) => (
                <article key={label} className="rounded-[1.7rem] bg-white/8 p-4">
                  <Icon className="text-white/65" />
                  <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
                  <p className="mt-1 text-sm font-medium text-white">{label}</p>
                  <p className="mt-0.5 text-xs text-white/45">{helper}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                  Informations du compte
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Profil réservé au pilotage super admin.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Actif
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Nom complet", value: name, Icon: FiShield },
                { label: "Email", value: user?.email || "Non renseigné", Icon: FiMail },
                { label: "Téléphone", value: user?.phone || "Non renseigné", Icon: FiPhone },
                { label: "Rôle", value: "Super admin", Icon: FiCheckCircle },
              ].map(({ label, value, Icon }) => (
                <article key={label} className="rounded-[1.5rem] bg-neutral-50 p-4">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                    <Icon />
                    {label}
                  </p>
                  <p className="mt-3 break-words text-sm font-semibold text-neutral-950">{value}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] bg-white p-6">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
              Raccourcis
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Les actions les plus utilisées.
            </p>
            <div className="mt-5 space-y-3">
              {[
                { href: "/admin/users", label: "Gérer les utilisateurs", Icon: FiUsers },
                { href: "/admin/verifications", label: "Vérifications KYC", Icon: FiCheckCircle },
                { href: "/messages", label: "Conversations", Icon: FiMessageCircle },
              ].map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between rounded-[1.3rem] bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-800"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="text-neutral-500" />
                    {label}
                  </span>
                  <span className="text-neutral-300">→</span>
                </Link>
              ))}
            </div>
          </aside>
        </section>

        <section className="rounded-[2rem] bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                Activité récente
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Vue rapide des derniers mouvements.
              </p>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500">
              {dashboard?.recent_activities.length ?? 0} événement(s)
            </span>
          </div>

          <div className="mt-5 divide-y divide-neutral-100">
            {(dashboard?.recent_activities ?? []).slice(0, 5).map((item) => (
              <article key={item.id} className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-neutral-950">{item.title}</p>
                  <p className="mt-1 text-sm text-neutral-500">{item.description}</p>
                </div>
                <p className="shrink-0 text-xs text-neutral-400">{formatDate(item.created_at)}</p>
              </article>
            ))}
            {!dashboard?.recent_activities.length && (
              <p className="py-4 text-sm text-neutral-500">
                Aucune activité récente à afficher pour le moment.
              </p>
            )}
          </div>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </section>
      </motion.section>
    </main>
  );
}
