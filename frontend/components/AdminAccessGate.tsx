"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { FiShield } from "react-icons/fi";
import { useAuthStore } from "@/stores/authStore";

export function AdminAccessGate({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) {
    return (
      <main className="mx-auto max-w-md px-4 pb-28 pt-24">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-soft">
          <h1 className="text-lg font-semibold">Accès super admin</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Connectez-vous avec un compte admin pour piloter toute la plateforme.
          </p>
          <Link
            href="/connexion"
            className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Aller à la connexion
          </Link>
        </section>
      </main>
    );
  }

  if (user?.role !== "admin") {
    return (
      <main className="mx-auto max-w-lg px-4 pb-28 pt-24">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <FiShield />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Accès refusé</h1>
              <p className="text-sm text-neutral-600">Cette interface est réservée au super admin.</p>
            </div>
          </div>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Retour à l’accueil
          </Link>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
