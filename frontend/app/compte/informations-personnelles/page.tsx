"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiCalendar,
  FiCamera,
  FiEdit3,
  FiMail,
  FiPhone,
  FiUser,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { updateMyAccount } from "@/lib/account";
import { getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export default function InformationsPersonnellesPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isVerified = Boolean(user?.is_verified);
  const isOwnerPending = user?.owner_verification_status === "pending_review";
  const bottomNav = <BottomNav />;
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return null;
    if (value.startsWith("http") || value.startsWith("data:")) return value;
    return `${getApiBaseUrl()}${value}`;
  };


  useEffect(() => {
    setForm({
      fullName: user?.full_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
  }, [user?.email, user?.full_name, user?.phone]);

  const name = form.fullName || user?.full_name || "Commercial Test";
  const email = form.email || user?.email || "commercial@gimo.local";
  const phone = form.phone || user?.phone || "+2250700000001";
  const displayedAvatar = resolveAvatarUrl(user?.profile_image_url);
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

  const handleSave = async () => {
    if (!token || !user) return;
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await updateMyAccount(token, {
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setUser({
        ...user,
        email: updated.email,
        full_name: updated.full_name,
        phone: updated.phone,
        profile_image_url: updated.profile_image_url,
        is_verified: updated.is_verified,
        owner_verification_status: updated.owner_verification_status,
      });
      setIsEditing(false);
      setMessage("Informations personnelles mises à jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification impossible.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto max-w-md px-4 pb-28 pt-24">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-soft">
            <h1 className="text-lg font-semibold">Connexion requise</h1>
            <p className="mt-2 text-xs text-neutral-600">
              Connectez-vous pour voir vos informations personnelles.
            </p>
            <Link
              href="/connexion"
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Aller a la connexion
            </Link>
          </section>
        </main>
        {bottomNav}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-24">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          <div className="flex items-center justify-between">
            <Link
              href="/compte"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-soft"
            >
              <FiArrowLeft />
            </Link>
            <div className="rounded-full border border-neutral-200 bg-white px-4 py-1 text-xs font-semibold text-neutral-600 shadow-soft">
              1 / 1
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">
                Informations personnelles
              </h1>
              <p className="mt-1 text-sm text-neutral-600">Vos donnees de profil</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsEditing((value) => !value);
                setMessage(null);
                setError(null);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-soft"
            >
              <FiEdit3 />
              {isEditing ? "Fermer" : "Modifier"}
            </button>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
            <div className="h-full w-full rounded-full bg-blue-500" />
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-soft">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-xl font-semibold text-white">
                  {displayedAvatar ? (
                    <img
                      src={displayedAvatar}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-white text-blue-600 shadow-soft">
                  <FiCamera />
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-neutral-900">{name}</h2>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                  Actif
                </span>
                {isVerified && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                    Verifie
                  </span>
                )}
                {isOwnerPending && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                    En attente
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
            <h3 className="text-sm font-semibold text-neutral-900">Details du compte</h3>
            {isEditing ? (
              <div className="mt-4 space-y-3 text-sm">
                {[
                  { key: "fullName", label: "Nom complet", icon: FiUser, value: form.fullName, type: "text" },
                  { key: "phone", label: "Telephone", icon: FiPhone, value: form.phone, type: "tel" },
                  { key: "email", label: "Email", icon: FiMail, value: form.email, type: "email" },
                ].map((item) => (
                  <label key={item.key} className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <span className="flex items-center gap-2">
                      <item.icon className="text-neutral-400" />
                      {item.label}
                    </span>
                    <input
                      type={item.type}
                      value={item.value}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, [item.key]: event.target.value }))
                      }
                      className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                ))}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSaving ? "Sauvegarde..." : "Enregistrer"}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                {[
                  { icon: FiUser, label: "Nom complet", value: name },
                  { icon: FiPhone, label: "Telephone", value: phone },
                  { icon: FiMail, label: "Email", value: email },
                  { icon: FiCalendar, label: "Compte cree le", value: "26 fevrier 2026" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <item.icon />
                    </span>
                    <div>
                      <p className="text-xs text-neutral-500">{item.label}</p>
                      <p className="font-semibold text-neutral-900">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{message}</p>}
            {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-600">{error}</p>}
          </div>
        </motion.section>
      </main>
      {bottomNav}
    </div>
  );
}


