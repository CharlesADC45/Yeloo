"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

type FormState = {
  email: string;
  password: string;
};

const DEFAULT_FORM: FormState = {
  email: "",
  password: "",
};

export default function ConnexionPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const router = useRouter();

  useEffect(() => {
    if (!shouldRedirect) return;
    const timer = window.setTimeout(() => {
      router.push("/");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [shouldRedirect, router]);

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setShouldRedirect(false);

    try {
      const body = new URLSearchParams({
        email: form.email.trim(),
        password: form.password,
      });

      const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const detail =
          payload?.detail ||
          payload?.message ||
          `Erreur API (${response.status})`;
        throw new Error(detail);
      }

      const tokenPayload = await response.json();
      const token = tokenPayload.access_token as string;

      const meResponse = await fetch(`${getApiBaseUrl()}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!meResponse.ok) {
        throw new Error("Impossible de recuperer le profil.");
      }

      const user = await meResponse.json();
      setSession(
        {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          role: user.role,
          profile_image_url: user.profile_image_url,
          is_verified: user.is_verified,
          owner_verification_status: user.owner_verification_status,
        },
        token
      );
      setSuccess("Connexion reussie.");
      setShouldRedirect(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur connexion.";
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
            Connexion
          </h1>
          <p className="mt-4 text-sm font-semibold">
            Accedez a votre compte Yeloo
          </p>

          <form className="mt-4 space-y-3 text-xs text-neutral-600" onSubmit={handleSubmit}>
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
                Mot de passe
              </span>
              <div className="flex items-center rounded-lg border border-neutral-200 bg-white pr-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200/70">
                <input
                  type={showPassword ? "text" : "password"}
                  required
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
              {isSubmitting ? "Connexion..." : "Se connecter"}
            </motion.button>
          </form>

          <p className="mt-4 text-center text-xs text-neutral-500">
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="font-semibold text-blue-600">
              Creer un compte
            </Link>
          </p>
        </motion.section>
      </main>
      <BottomNav />
    </div>
  );
}


