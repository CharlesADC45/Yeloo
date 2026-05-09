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
import { changePassword, updateMyAccount } from "@/lib/account";
import { getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

type OwnerProfile = {
  id: string;
  user_id: string;
  city: string;
  main_address: string;
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

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

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
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<"account" | "password">("account");
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    mainAddress: "",
    accountHolder: "",
    mobileMoney: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

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
    setAvatarLoadFailed(false);
  }, [user?.id]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.profile_image_url]);

  useEffect(() => {
    setProfileForm({
      fullName: user?.full_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      city: profile?.city || "",
      mainAddress: profile?.main_address || "",
      accountHolder: profile?.account_holder || "",
      mobileMoney: profile?.mobile_money || "",
    });
  }, [profile, user?.email, user?.full_name, user?.phone]);

  const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return null;
    if (value.startsWith("http") || value.startsWith("data:")) return value;
    return `${getApiBaseUrl()}${value}`;
  };

  const displayedAvatar = avatarLoadFailed ? null : avatarPreview ?? resolveAvatarUrl(user?.profile_image_url);
  const fullName = user?.full_name || "Proprietaire";
  const email = user?.email || "contact@yeloo.local";
  const phone = user?.phone || "-";
  const initials = useMemo(() => getInitials(fullName), [fullName]);

  const checklist = [
    { label: "Photo de profil", done: Boolean(displayedAvatar) },
    { label: "Identité", done: Boolean(fullName && email) },
    { label: "Téléphone", done: Boolean(user?.phone) },
    { label: "Adresse", done: Boolean(profile?.city && profile?.main_address) },
    { label: "Paiement", done: Boolean(profile?.account_holder && profile?.mobile_money) },
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

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setAvatarLoadFailed(false);

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
      setAvatarLoadFailed(false);
    }
    setUser({
      ...user,
      profile_image_url: updated.profile_image_url,
    });
  };

  const handleProfileSave = async () => {
    if (!token || !user) return;
    setIsSavingProfile(true);
    setError(null);
    setSuccess(null);
    try {
      const [updatedUser, updatedProfileResponse] = await Promise.all([
        updateMyAccount(token, {
          full_name: profileForm.fullName,
          email: profileForm.email,
          phone: profileForm.phone,
        }),
        fetch(`${getApiBaseUrl()}/api/owners/me`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            city: profileForm.city,
            main_address: profileForm.mainAddress,
            account_holder: profileForm.accountHolder,
            mobile_money: profileForm.mobileMoney,
          }),
        }),
      ]);

      if (!updatedProfileResponse.ok) {
        const payload = await updatedProfileResponse.json().catch(() => null);
        throw new Error(payload?.detail || "Impossible de modifier le profil propriétaire.");
      }

      const updatedProfile = (await updatedProfileResponse.json()) as OwnerProfile;
      setProfile(updatedProfile);
      setUser({
        ...user,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        phone: updatedUser.phone,
        profile_image_url: updatedUser.profile_image_url,
        is_verified: updatedUser.is_verified,
        owner_verification_status: updatedUser.owner_verification_status,
      });
      setSuccess("Profil propriétaire mis à jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification impossible.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!token) return;
    setIsSavingPassword(true);
    setError(null);
    setSuccess(null);
    try {
      if (passwordForm.next !== passwordForm.confirm) {
        throw new Error("Les nouveaux mots de passe ne correspondent pas.");
      }
      await changePassword(token, passwordForm.current, passwordForm.next);
      setPasswordForm({ current: "", next: "", confirm: "" });
      setSuccess("Mot de passe mis à jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification impossible.");
    } finally {
      setIsSavingPassword(false);
    }
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
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
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
      <main className="mx-auto max-w-4xl px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
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
          <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-soft lg:p-6">
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4 lg:gap-5">
                <div className="relative shrink-0">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.8rem] bg-neutral-300 text-3xl font-semibold text-white ring-2 ring-blue-100 lg:h-28 lg:w-28 lg:rounded-full lg:ring-0">
                    {displayedAvatar ? (
                      <img
                        src={displayedAvatar}
                        alt={fullName}
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
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-600 shadow-soft lg:bottom-1 lg:right-1 lg:h-9 lg:w-9"
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
                <div className="min-w-0 flex-1 space-y-2 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    Profil bailleur
                  </p>
                  <h1 className="break-words text-[1.6rem] font-semibold leading-tight tracking-tight text-neutral-950 lg:text-2xl">
                    {fullName}
                  </h1>
                  <p className="text-sm font-medium text-neutral-500">{phone}</p>
                  <p className="break-all text-sm leading-6 text-neutral-600">{email}</p>
                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                      Actif
                    </span>
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

            <div className="mt-4 flex gap-6 border-b border-neutral-200 text-sm">
              <button
                type="button"
                onClick={() => setActiveTab("account")}
                className={`pb-3 font-semibold ${
                  activeTab === "account"
                    ? "border-b-2 border-blue-600 text-blue-700"
                    : "text-neutral-500"
                }`}
              >
                My Account
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("password")}
                className={`pb-3 font-semibold ${
                  activeTab === "password"
                    ? "border-b-2 border-blue-600 text-blue-700"
                    : "text-neutral-500"
                }`}
              >
                Password
              </button>
            </div>
          </div>

          {activeTab === "password" ? (
            <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-neutral-950">Changer le mot de passe</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {[
                  ["Mot de passe actuel", "current"],
                  ["Nouveau mot de passe", "next"],
                  ["Confirmer", "confirm"],
                ].map(([label, key]) => (
                  <label key={key} className="block">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                      {label}
                    </span>
                    <input
                      type="password"
                      value={passwordForm[key as keyof typeof passwordForm]}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, [key]: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={handlePasswordSave}
                disabled={isSavingPassword}
                className="mt-5 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSavingPassword ? "Sauvegarde..." : "Mettre à jour"}
              </button>
            </section>
          ) : (
          <div className="grid gap-6 xl:grid-cols-[1.8fr_0.95fr]">
            <div className="space-y-6">
              <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-neutral-950">
                  Informations générales
                </h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    { label: "Nom complet", value: profileForm.fullName, key: "fullName", icon: FiUser },
                    { label: "Email", value: profileForm.email, key: "email", icon: FiMail },
                    { label: "Téléphone", value: profileForm.phone, key: "phone", icon: FiPhone },
                    { label: "Ville", value: profileForm.city, key: "city", icon: FiMapPin },
                    { label: "Adresse principale", value: profileForm.mainAddress, key: "mainAddress", icon: FiMapPin },
                    { label: "Titulaire du compte", value: profileForm.accountHolder, key: "accountHolder", icon: FiCreditCard },
                    { label: "Mobile money", value: profileForm.mobileMoney, key: "mobileMoney", icon: FiPhone },
                  ].map((field) => (
                    <label key={field.label} className="block">
                      <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                        <field.icon className="text-neutral-400" />
                        {field.label}
                      </span>
                      <input
                        value={field.value}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleProfileSave}
                  disabled={isSavingProfile}
                  className="mt-5 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSavingProfile ? "Sauvegarde..." : "Enregistrer les modifications"}
                </button>
              </section>

              <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
                <h2 className="text-lg font-semibold text-neutral-950">
                  Vérification et documents
                </h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {fields.slice(9).map((field) => (
                    <label key={field.label} className="block">
                      <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                        <field.icon className="text-neutral-400" />
                        {field.label}
                      </span>
                      <input
                        readOnly
                        value={field.value}
                        className="w-full rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-800 outline-none ring-1 ring-black/5"
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
                    className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-800 ring-1 ring-black/5"
                  >
                    <span className="flex items-center gap-3">
                      <FiHome className="text-neutral-500" />
                      Mes biens
                    </span>
                    <FiChevronRight className="text-neutral-300" />
                  </Link>
                  <Link
                    href="/proprietaire"
                    className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-800 ring-1 ring-black/5"
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
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}
            </>
          )}
        </motion.section>
      </main>
    </div>
  );
}
