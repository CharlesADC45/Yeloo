"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiMail,
  FiMessageCircle,
  FiShield,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { useAuthStore } from "@/stores/authStore";

function formatDate(value?: string | null) {
  if (!value) return "Session active";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function AdminProfilePage() {
  const user = useAuthStore((s) => s.user);
  const fullName = user?.full_name || "Super admin";
  const email = user?.email || "admin@yeloo.local";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profileStats = [
    { label: "Rôle", value: "Super admin", Icon: FiShield },
    { label: "Compte", value: user?.is_verified ? "Vérifié" : "Actif", Icon: FiCheckCircle },
    { label: "Sécurité", value: "Accès global", Icon: FiActivity },
  ];

  const profileFields = [
    { label: "Nom complet", value: fullName, Icon: FiUser },
    { label: "Email", value: email, Icon: FiMail },
    { label: "Téléphone", value: user?.phone || "Non renseigné", Icon: FiClock },
    { label: "Rôle", value: "Administrateur plateforme", Icon: FiShield },
    { label: "Identifiant", value: user?.id || "Session locale", Icon: FiUsers },
    { label: "Dernière synchronisation", value: formatDate(new Date().toISOString()), Icon: FiCalendar },
  ];

  return (
    <main className="mx-auto w-full bg-white px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-8"
      >
        <section className="max-w-5xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
            <FiShield />
            Profil admin
          </div>
          <div className="mt-5 flex flex-col gap-6 rounded-[2rem] bg-neutral-950 p-5 text-white sm:p-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.7rem] bg-white text-2xl font-black text-neutral-950">
                {initials || "SA"}
              </div>
              <div>
                <p className="text-sm text-white/60">Bienvenue dans le cockpit Yeloo</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  {fullName}
                </h1>
                <p className="mt-2 text-sm text-white/70">{email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950"
              >
                <FiUsers />
                Utilisateurs
              </Link>
              <Link
                href="/messages"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15"
              >
                <FiMessageCircle />
                Conversations
              </Link>
            </div>
          </div>
        </section>

        <section className="grid max-w-5xl gap-3 sm:grid-cols-3">
          {profileStats.map(({ label, value, Icon }) => (
            <article key={label} className="rounded-[1.5rem] bg-neutral-50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-700">
                <Icon />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                {label}
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-neutral-950">{value}</p>
            </article>
          ))}
        </section>

        <section className="max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.035em] text-neutral-950">
                Informations administrateur
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Un profil dédié au super admin, séparé du compte locataire.
              </p>
            </div>
            <Link
              href="/compte/changer-mot-de-passe"
              className="hidden rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white sm:inline-flex"
            >
              Modifier le mot de passe
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {profileFields.map(({ label, value, Icon }) => (
              <article key={label} className="rounded-[1.35rem] bg-neutral-50 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  <Icon className="text-neutral-500" />
                  {label}
                </div>
                <p className="mt-3 break-words text-base font-semibold text-neutral-950">{value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="max-w-5xl rounded-[1.6rem] bg-blue-50 p-5 text-blue-950">
          <div className="flex items-start gap-3">
            <FiEdit3 className="mt-1 shrink-0" />
            <div>
              <p className="font-semibold">À propos de ce profil</p>
              <p className="mt-1 text-sm leading-6 text-blue-900/75">
                Cette page reprend le flow propre du dashboard admin: identité, rôle,
                accès rapides et informations utiles, sans renvoyer vers le profil
                locataire classique.
              </p>
            </div>
          </div>
        </section>
      </motion.section>
    </main>
  );
}
