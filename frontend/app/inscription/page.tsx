"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { getApiBaseUrl } from "@/lib/api";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: "locataire" | "proprietaire";
};

const DEFAULT_FORM: FormState = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  role: "locataire",
};

export default function InscriptionPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shouldRedirectToLogin, setShouldRedirectToLogin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!shouldRedirectToLogin) return;
    const timer = window.setTimeout(() => {
      router.push("/connexion");
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [router, shouldRedirectToLogin]);

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setShouldRedirectToLogin(false);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          full_name: form.fullName.trim() || null,
          password: form.password,
          role: form.role,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const detail =
          payload?.detail ||
          payload?.message ||
          `Erreur API (${response.status})`;
        throw new Error(detail);
      }

      await response.json();
      setSuccess("Compte créé. Redirection vers la connexion...");
      setShouldRedirectToLogin(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur d'inscription.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <main className="mx-auto flex max-w-md flex-col px-4 pb-28 pt-24">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl bg-white p-5 shadow-soft sm:p-6"
        >
          <h1 className="text-center text-base font-semibold sm:text-lg">
            Inscription
          </h1>
          <p className="mt-4 text-sm font-semibold">
            Creez votre compte Yeloo
          </p>

          <form className="mt-4 space-y-3 text-xs text-neutral-600" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Nom complet
              </span>
              <input
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                placeholder="Ex: Awa Traore"
                value={form.fullName}
                onChange={handleChange("fullName")}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Email
              </span>
              <input
                type="email"
                required
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                placeholder="vous@email.com"
                value={form.email}
                onChange={handleChange("email")}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Telephone
              </span>
              <input
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                placeholder="Ex: +225 07 00 00 00 00"
                value={form.phone}
                onChange={handleChange("phone")}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Mot de passe
              </span>
              <input
                type="password"
                required
                minLength={6}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                value={form.password}
                onChange={handleChange("password")}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Profil
              </span>
              <select
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-blue-200/70 focus:border-blue-400 focus:ring-2"
                value={form.role}
                onChange={handleChange("role")}
              >
                <option value="locataire">Locataire</option>
                <option value="proprietaire">Proprietaire</option>
              </select>
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {success}
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={isSubmitting}
              className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creation..." : "Creer le compte"}
            </motion.button>
          </form>

          <p className="mt-4 text-center text-xs text-neutral-500">
            Deja un compte? {" "}
            <Link href="/connexion" className="font-semibold text-blue-600">
              Se connecter
            </Link>
          </p>
        </motion.section>
      </main>
      <BottomNav />
    </div>
  );
}

