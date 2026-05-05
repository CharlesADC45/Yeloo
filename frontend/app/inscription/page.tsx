"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff, FiHome, FiUser } from "react-icons/fi";
import { BottomNav } from "@/components/BottomNav";
import { CiPhoneField } from "@/components/CiPhoneField";
import { TopBar } from "@/components/TopBar";
import { getApiBaseUrl } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { normalizeIvoryCoastPhoneForApi } from "@/lib/phone";

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
  const [showPassword, setShowPassword] = useState(false);
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
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const setRole = (role: FormState["role"]) => {
    setForm((prev) => ({ ...prev, role }));
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
          phone: normalizeIvoryCoastPhoneForApi(form.phone) || null,
          full_name: form.fullName.trim() || null,
          password: form.password,
          role: form.role,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const detail = getApiErrorMessage(payload, `Erreur API (${response.status})`);
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
            Créez votre compte Yeloo
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
            <CiPhoneField
              label="Telephone"
              required
              value={form.phone}
              onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
            />
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Mot de passe
              </span>
              <div className="flex items-center rounded-lg border border-neutral-200 bg-white pr-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200/70">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                  value={form.password}
                  onChange={handleChange("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-neutral-500 transition hover:text-neutral-900"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Montrer le mot de passe"}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                  {showPassword ? "Masquer" : "Montrer"}
                </button>
              </div>
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Profil
              </span>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-neutral-50 p-1.5 ring-1 ring-neutral-100">
                {[
                  { value: "locataire" as const, label: "Locataire", Icon: FiUser },
                  { value: "proprietaire" as const, label: "Propriétaire", Icon: FiHome },
                ].map(({ value, label, Icon }) => {
                  const active = form.role === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value)}
                      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                        active
                          ? "bg-white text-neutral-950 shadow-[0_10px_30px_rgba(15,23,42,0.10)]"
                          : "text-neutral-500"
                      }`}
                      aria-pressed={active}
                    >
                      <Icon className="text-base" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

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
              {isSubmitting ? "Création..." : "Créer le compte"}
            </motion.button>
          </form>

          <p className="mt-4 text-center text-xs text-neutral-500">
            Déjà un compte?{" "}
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

