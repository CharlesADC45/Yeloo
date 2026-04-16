"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowLeft, FiEye, FiEyeOff, FiLock } from "react-icons/fi";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { changePassword } from "@/lib/account";
import { useAuthStore } from "@/stores/authStore";

export default function ChangerMotDePassePage() {
  const token = useAuthStore((state) => state.token);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError("Connectez-vous pour changer votre mot de passe.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await changePassword(token, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Mot de passe changé avec succès.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de changer le mot de passe.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputType = showPassword ? "text" : "password";

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <main className="mx-auto max-w-md px-4 pb-28 pt-24">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <Link
              href="/compte/parametres"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700"
              aria-label="Retour"
            >
              <FiArrowLeft />
            </Link>
            <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
              Sécurité
            </span>
          </div>

          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FiLock />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">
              Changer le mot de passe
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Choisissez un mot de passe solide pour garder votre compte Yeloo protégé.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              {
                label: "Mot de passe actuel",
                value: currentPassword,
                onChange: setCurrentPassword,
              },
              {
                label: "Nouveau mot de passe",
                value: newPassword,
                onChange: setNewPassword,
              },
              {
                label: "Confirmer le nouveau mot de passe",
                value: confirmPassword,
                onChange: setConfirmPassword,
              },
            ].map((field) => (
              <label key={field.label} className="block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                {field.label}
                <div className="mt-2 flex h-12 items-center rounded-2xl border border-neutral-200 bg-white px-4">
                  <input
                    type={inputType}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    className="h-12 min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="ml-3 text-neutral-500"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Montrer le mot de passe"}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </label>
            ))}

            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

            <button
              type="submit"
              disabled={isSaving}
              className="h-12 w-full rounded-full bg-blue-600 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Modification..." : "Enregistrer"}
            </button>
          </form>
        </motion.section>
      </main>
      <BottomNav />
    </div>
  );
}
