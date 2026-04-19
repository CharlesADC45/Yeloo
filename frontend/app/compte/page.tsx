"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FiChevronRight,
  FiHelpCircle,
  FiLogOut,
  FiSettings,
  FiUser,
  FiWifiOff,
  FiCamera,
  FiEdit3,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { getApiBaseUrl } from "@/lib/api";
import { updateMyAccount } from "@/lib/account";
import { useAuthStore } from "@/stores/authStore";
import { useFavoritesStore } from "@/stores/favoritesStore";

export default function ComptePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const favoriteCount = useFavoritesStore((s) => s.favoriteIds.length);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const name = user?.full_name || "Utilisateur";
  const email = user?.email || "contact@yeloo.local";
  const phone = user?.phone || "+2250700000000";
  const isVerified = Boolean(user?.is_verified);
  const isOwnerPending = user?.owner_verification_status === "pending_review";
  const bottomNav = <BottomNav />;

  const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return null;
    if (value.startsWith("http") || value.startsWith("data:")) return value;
    return `${getApiBaseUrl()}${value}`;
  };

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    setAvatarPreview(null);
  }, [user?.id]);

  useEffect(() => {
    setForm({
      fullName: user?.full_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
  }, [user?.email, user?.full_name, user?.phone]);

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

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!token) return;

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${getApiBaseUrl()}/api/users/me/avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      setAvatarPreview(null);
      return;
    }

    const updated = await response.json();
    const resolved = resolveAvatarUrl(updated.profile_image_url);
    if (resolved) {
      setAvatarPreview(resolved);
    }
    if (user) {
      setUser({
        ...user,
        profile_image_url: updated.profile_image_url,
      });
    }
  };

  const displayedAvatar = avatarPreview ?? resolveAvatarUrl(user?.profile_image_url);

  const handleProfileSave = async () => {
    if (!token || !user) return;
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const updated = await updateMyAccount(token, {
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
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
      setIsEditingProfile(false);
      setProfileSuccess("Profil mis à jour.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Modification impossible.");
    } finally {
      setIsSavingProfile(false);
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
              Connectez-vous pour acceder a votre compte.
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
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-24">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
                <p className="mt-1 text-sm text-neutral-600">
                  Gerez vos informations personnelles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfile((value) => !value)}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <FiEdit3 />
                {isEditingProfile ? "Fermer" : "Modifier le profil"}
              </button>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
            <div className="space-y-5">
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-xl font-semibold text-white ring-4 ring-blue-100">
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
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-600 shadow-soft"
                    >
                      <FiCamera />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-neutral-900">
                    {name}
                  </h2>
                  <p className="text-sm text-neutral-500">{phone}</p>
                  <p className="text-xs text-neutral-400">{email}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs">
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

              {isEditingProfile && (
                <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
                  <h3 className="text-sm font-semibold text-neutral-900">Modifier le profil</h3>
                  <div className="mt-4 grid gap-3">
                    <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Nom complet
                      <input
                        value={form.fullName}
                        onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                        className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Email
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                        className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Téléphone
                      <input
                        value={form.phone}
                        onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                        className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-normal normal-case tracking-normal text-neutral-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                  {profileError && <p className="mt-3 text-xs text-red-600">{profileError}</p>}
                  {profileSuccess && <p className="mt-3 text-xs text-emerald-600">{profileSuccess}</p>}
                  <button
                    type="button"
                    onClick={handleProfileSave}
                    disabled={isSavingProfile}
                    className="mt-4 w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isSavingProfile ? "Sauvegarde..." : "Enregistrer"}
                  </button>
                </div>
              )}

              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Favoris enregistrés
                </h3>
                <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Favoris
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">
                    {favoriteCount}
                  </p>
                  <p className="mt-2 text-sm text-neutral-500">
                    Retrouve ici les logements que tu as aimés.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Navigation rapide
                </h3>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Statut de synchro offline", icon: FiWifiOff, href: "/compte/offline" },
                    { label: "Informations personnelles", icon: FiUser, href: "/compte/informations-personnelles" },
                    { label: "Mot de passe", icon: FiSettings, href: "/compte/changer-mot-de-passe" },
                    { label: "Parametres", icon: FiSettings, href: "/compte/parametres" },
                    { label: "Aide & Support", icon: FiHelpCircle, href: "/compte/aide-support" },
                  ].map((item) => (
                    item.href ? (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-white"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <item.icon />
                          </span>
                          {item.label}
                        </span>
                        <FiChevronRight className="text-neutral-400" />
                      </Link>
                    ) : (
                      <button
                        key={item.label}
                        className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-white"
                        type="button"
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <item.icon />
                          </span>
                          {item.label}
                        </span>
                        <FiChevronRight className="text-neutral-400" />
                      </button>
                    )
                  ))}
                </div>
              </div>

              <button
                onClick={() => logout()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100"
              >
                <FiLogOut />
                Se deconnecter
              </button>
            </div>
          </div>
        </motion.section>
      </main>
      {bottomNav}
    </div>
  );
}


