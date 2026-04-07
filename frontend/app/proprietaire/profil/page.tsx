"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FiCalendar,
  FiCamera,
  FiChevronRight,
  FiCheckCircle,
  FiCreditCard,
  FiFileText,
  FiHome,
  FiMail,
  FiMapPin,
  FiPhone,
  FiUser,
} from "react-icons/fi";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { OwnerProfileSkeleton } from "@/components/Skeleton";
import { TopBar } from "@/components/TopBar";
import { getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

type OwnerProfile = {
  id: string;
  user_id: string;
  city: string;
  main_address: string;
  bank_name: string;
  account_number: string;
  mobile_money: string;
  account_holder: string;
  identity_doc_name?: string | null;
  identity_selfie_name?: string | null;
  property_proof_name?: string | null;
  verification_status: string;
  verification_notes?: string | null;
  created_at: string;
  updated_at: string;
};

function maskAccountNumber(value: string) {
  if (!value) return "-";
  if (value.length <= 4) return value;
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export default function ProprietaireProfilPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isOwnerRole = user?.role === "proprietaire" || user?.role === "admin";
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (!isOwnerRole) {
      router.replace("/");
      return;
    }
  }, [isAuthenticated, isOwnerRole, router, user]);

  useEffect(() => {
    if (!token || !isOwnerRole) return;
    let isMounted = true;

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/owners/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const detail =
            payload?.detail || payload?.message || `Erreur API (${response.status})`;
          throw new Error(detail);
        }

        const data = (await response.json()) as OwnerProfile;
        if (isMounted) {
          setProfile(data);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger le profil propriétaire."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [isOwnerRole, token]);

  useEffect(() => {
    setAvatarPreview(null);
  }, [user?.id]);

  const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return null;
    if (value.startsWith("http") || value.startsWith("data:")) return value;
    return `${getApiBaseUrl()}${value}`;
  };

  const displayedAvatar = avatarPreview ?? resolveAvatarUrl(user?.profile_image_url);
  const fullName = user?.full_name || "Proprietaire";
  const email = user?.email || "contact@yeloo.local";
  const phone = user?.phone || "-";
  const initials = useMemo(
    () =>
      fullName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [fullName]
  );

  const checklist = [
    { label: "Photo de profil", done: Boolean(displayedAvatar) },
    { label: "Identité", done: Boolean(fullName && email) },
    { label: "Téléphone", done: Boolean(user?.phone) },
    { label: "Adresse", done: Boolean(profile?.city && profile?.main_address) },
    { label: "Paiement", done: Boolean(profile?.bank_name && profile?.account_number) },
    {
      label: "Documents",
      done: Boolean(profile?.identity_doc_name && profile?.property_proof_name),
    },
  ];
  const completedCount = checklist.filter((item) => item.done).length;
  const completionPercent = Math.round((completedCount / checklist.length) * 100);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token || !user) return;

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${getApiBaseUrl()}/api/users/me/avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) return;

    const updated = await response.json();
    const resolved = resolveAvatarUrl(updated.profile_image_url);
    if (resolved) {
      setAvatarPreview(resolved);
    }
    setUser({
      ...user,
      profile_image_url: updated.profile_image_url,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto max-w-md px-4 pb-28 pt-24">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-soft">
            <h1 className="text-lg font-semibold">Accès propriétaire</h1>
            <p className="mt-2 text-xs text-neutral-600">
              Connectez-vous pour accéder à votre profil propriétaire.
            </p>
            <Link
              href="/connexion"
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Aller à la connexion
            </Link>
          </section>
        </main>
      </div>
    );
  }

  if (isAuthenticated && user && !isOwnerRole) {
    return null;
  }

  const fields = [
    { label: "Nom complet", value: fullName, icon: FiUser },
    { label: "Email", value: email, icon: FiMail },
    { label: "Téléphone", value: phone, icon: FiPhone },
    { label: "Ville", value: profile?.city || "-", icon: FiMapPin },
    { label: "Adresse principale", value: profile?.main_address || "-", icon: FiMapPin },
    { label: "Titulaire du compte", value: profile?.account_holder || "-", icon: FiCreditCard },
    { label: "Banque", value: profile?.bank_name || "-", icon: FiCreditCard },
    {
      label: "Numéro de compte",
      value: profile?.account_number ? maskAccountNumber(profile.account_number) : "-",
      icon: FiCreditCard,
    },
    { label: "Mobile money", value: profile?.mobile_money || "-", icon: FiPhone },
    {
      label: "Document d'identité",
      value: profile?.identity_doc_name || "Non fourni",
      icon: FiFileText,
    },
    {
      label: "Preuve de propriété",
      value: profile?.property_proof_name || "Non fournie",
      icon: FiFileText,
    },
    {
      label: "Profil créé le",
      value: profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString("fr-FR")
        : "-",
      icon: FiCalendar,
    },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <OwnerSidebar />
      <main className="mx-auto max-w-4xl px-4 pb-28 pt-24 lg:ml-64 lg:max-w-[calc(100%-16rem)] lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {isLoading ? (
            <OwnerProfileSkeleton />
          ) : (
            <>
          <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex items-start gap-5">
                <div className="relative">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-neutral-300 text-3xl font-semibold text-white">
                    {displayedAvatar ? (
                      <img
                        src={displayedAvatar}
                        alt={fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 shadow-soft"
                    aria-label="Changer la photo"
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
                <div className="space-y-2 pt-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
                    [User] {fullName}
                  </h1>
                  <p className="text-sm text-neutral-600">Email: {email}</p>
                  <div className="flex flex-wrap gap-2 pt-2 text-xs">
                    <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
                      Propriétaire vérifié
                    </span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-600">
                      {completionPercent}% complété
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-6 border-b border-neutral-200 text-sm">
              <button
                type="button"
                className="border-b-2 border-blue-600 pb-3 font-semibold text-blue-700"
              >
                My Account
              </button>
              <button type="button" className="pb-3 text-neutral-500">
                Password
              </button>
              <button type="button" className="pb-3 text-neutral-500">
                Notifications
              </button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.8fr_0.95fr]">
            <div className="space-y-6">
              <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-neutral-950">
                  Informations générales
                </h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {fields.slice(0, 8).map((field) => (
                    <label key={field.label} className="block">
                      <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                        <field.icon className="text-neutral-400" />
                        {field.label}
                      </span>
                      <input
                        readOnly
                        value={field.value}
                        className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800 outline-none"
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-neutral-950">
                  Vérification et documents
                </h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {fields.slice(8).map((field) => (
                    <label key={field.label} className="block">
                      <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                        <field.icon className="text-neutral-400" />
                        {field.label}
                      </span>
                      <input
                        readOnly
                        value={field.value}
                        className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800 outline-none"
                      />
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-neutral-950">
                      Profil {completedCount}/{checklist.length}
                    </p>
                    <p className="text-sm text-neutral-500">
                      Complétez votre profil pour rassurer les locataires.
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">
                    {completionPercent}%
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <div className="mt-6 space-y-4">
                  {checklist.map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                          item.done
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-neutral-100 text-neutral-400"
                        }`}
                      >
                        <FiCheckCircle className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{item.label}</p>
                        <p className="text-xs text-neutral-500">
                          {item.done ? "Complété" : "À compléter"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
                <h2 className="text-base font-semibold text-neutral-950">
                  Raccourcis
                </h2>
                <div className="mt-4 space-y-3">
                  <Link
                    href="/proprietaire/biens"
                    className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-800 hover:bg-white"
                  >
                    <span className="flex items-center gap-3">
                      <FiHome className="text-neutral-500" />
                      Mes biens
                    </span>
                    <FiChevronRight className="text-neutral-300" />
                  </Link>
                  <Link
                    href="/proprietaire"
                    className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-800 hover:bg-white"
                  >
                    <span className="flex items-center gap-3">
                      <FiUser className="text-neutral-500" />
                      Retour au dashboard
                    </span>
                    <FiChevronRight className="text-neutral-300" />
                  </Link>
                </div>
              </section>
            </aside>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
            </>
          )}
        </motion.section>
      </main>
    </div>
  );
}
