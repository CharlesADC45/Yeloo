"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FiCamera,
  FiChevronRight,
  FiHelpCircle,
  FiSettings,
  FiUser,
  FiWifiOff,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useFavoritesStore } from "@/stores/favoritesStore";

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function ComptePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const favoriteCount = useFavoritesStore((s) => s.favoriteIds.length);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const name = user?.full_name || "Utilisateur";
  const email = user?.email || "contact@yeloo.local";
  const phone = user?.phone || "+2250700000000";
  const isVerified = Boolean(user?.is_verified);
  const isOwnerPending = user?.owner_verification_status === "pending_review";

  const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return null;
    if (value.startsWith("http") || value.startsWith("data:")) return value;
    return `${getApiBaseUrl()}${value}`;
  };

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    setAvatarPreview(null);
    setAvatarLoadFailed(false);
  }, [user?.id]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.profile_image_url]);

  const initials = useMemo(() => getInitials(name), [name]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

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
  const avatarSrc = avatarLoadFailed ? null : displayedAvatar;

  const quickLinks = [
    { label: "Statut de synchro offline", icon: FiWifiOff, href: "/compte/offline" },
    {
      label: "Informations personnelles",
      icon: FiUser,
      href: "/compte/informations-personnelles",
    },
    { label: "Paramètres", icon: FiSettings, href: "/compte/parametres" },
    { label: "Aide & Support", icon: FiHelpCircle, href: "/compte/aide-support" },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto max-w-md px-4 pb-28 pt-24">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-soft">
            <h1 className="text-lg font-semibold">Connexion requise</h1>
            <p className="mt-2 text-xs text-neutral-600">
              Connectez-vous pour accéder à votre compte.
            </p>
            <Link
              href="/connexion"
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Aller à la connexion
            </Link>
          </section>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-24 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-5">
                <div className="border-b border-neutral-200 pb-6">
                  <h1 className="text-[2.25rem] font-semibold tracking-tight text-neutral-950">
                    Profil
                  </h1>
                  {/* <p className="mt-2 max-w-xs text-sm leading-6 text-neutral-600">
                    Gérez votre compte et vos réglages dans un espace plus clair.
                  </p> */}
                </div>

                <nav className="space-y-2">
                  <Link
                    href="/compte"
                    className="flex items-center gap-3 rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-900"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 shadow-soft">
                      <FiUser />
                    </span>
                    À propos
                  </Link>
                  {quickLinks.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 shadow-soft">
                        <item.icon />
                      </span>
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="space-y-6">
              <header className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft lg:hidden">
                <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
                <p className="mt-1 text-sm text-neutral-600">
                  Gérez vos informations personnelles.
                </p>
              </header>

              <section className="hidden rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft lg:block lg:p-8">
                <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
                  <div className="hidden min-w-0 flex-col items-center text-center lg:flex lg:items-start lg:text-left xl:flex-row xl:items-center xl:gap-6">
                    <div className="relative shrink-0">
                      <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-xl font-semibold text-white ring-4 ring-blue-100">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={name}
                            className="h-full w-full object-cover"
                            onError={() => {
                              setAvatarLoadFailed(true);
                              setAvatarPreview(null);
                            }}
                          />
                        ) : (
                          <span className="text-3xl font-bold leading-none tracking-normal">
                            {initials}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 shadow-soft"
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

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-500">Compte personnel</p>
                      <h2 className="mt-1 break-words text-3xl font-semibold tracking-tight text-neutral-950">
                        {name}
                      </h2>
                      <p className="mt-2 break-all text-sm text-neutral-600">{email}</p>
                      <p className="mt-1 text-sm text-neutral-500">{phone}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                          Actif
                        </span>
                        {isVerified && (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                            Vérifié
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

                  <div className="hidden gap-3 sm:grid-cols-3 xl:min-w-[22rem] lg:grid">
                    <div className="rounded-2xl bg-neutral-50 px-4 py-4 ring-1 ring-black/5">
                      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Favoris</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
                        {favoriteCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-neutral-50 px-4 py-4 ring-1 ring-black/5">
                      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Statut</p>
                      <p className="mt-3 text-lg font-semibold text-neutral-950">
                        {isVerified ? "Vérifié" : "Standard"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-neutral-50 px-4 py-4 ring-1 ring-black/5">
                      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Accès</p>
                      <p className="mt-3 text-lg font-semibold text-neutral-950">
                        {user?.role === "admin"
                          ? "Admin"
                          : user?.role === "proprietaire"
                            ? "Bailleur"
                            : "Locataire"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.95fr]">
                <div className="space-y-5">
                  <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft lg:hidden">
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.75rem] bg-blue-600 text-xl font-semibold text-white ring-2 ring-blue-100">
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={name}
                              className="h-full w-full object-cover"
                              onError={() => {
                                setAvatarLoadFailed(true);
                                setAvatarPreview(null);
                              }}
                            />
                          ) : (
                            <span className="text-2xl font-bold leading-none tracking-normal">
                              {initials}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-600 shadow-soft"
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
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                          Compte personnel
                        </p>
                        <h2 className="mt-1 break-words text-[1.45rem] font-semibold leading-tight text-neutral-950">
                          {name}
                        </h2>
                        <p className="mt-2 text-sm font-medium text-neutral-600">{phone}</p>
                        <p className="mt-1 break-all text-xs leading-5 text-neutral-400">{email}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                            Actif
                          </span>
                          {isVerified && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                              Vérifié
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
                  </section>

                  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
                    <h3 className="text-lg font-semibold text-neutral-900">À propos de vous</h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {[
                        { label: "Nom", value: name },
                        { label: "Téléphone", value: phone },
                        { label: "Email", value: email },
                        {
                          label: "Statut propriétaire",
                          value: isOwnerPending
                            ? "En attente de validation"
                            : isVerified
                              ? "Compte vérifié"
                              : "Compte standard",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl bg-neutral-50 px-4 py-4 ring-1 ring-black/5"
                        >
                          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                            {item.label}
                          </p>
                          <p className="mt-2 break-words text-sm font-medium text-neutral-900">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
                    <h3 className="text-sm font-semibold text-neutral-900">Favoris enregistrés</h3>
                    <div className="mt-4 rounded-2xl bg-neutral-50 p-5 text-center ring-1 ring-black/5">
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
                  </section>
                </div>

                <div className="space-y-5">
                  <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
                    <h3 className="text-lg font-semibold text-neutral-900">Vos espaces</h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      Accédez directement à vos réglages et outils utiles.
                    </p>
                    <div className="mt-4 grid gap-3">
                      {quickLinks.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-4 text-sm font-medium text-neutral-800 ring-1 ring-black/5 transition hover:bg-neutral-100"
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 ring-1 ring-black/5">
                              <item.icon />
                            </span>
                            {item.label}
                          </span>
                          <FiChevronRight className="text-neutral-400" />
                        </Link>
                      ))}
                    </div>
                  </section>

                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
      <BottomNav />
    </div>
  );
}
