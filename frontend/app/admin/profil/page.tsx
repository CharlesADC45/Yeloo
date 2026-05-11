"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FiActivity,
  FiCamera,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiMail,
  FiMessageCircle,
  FiPhone,
  FiShield,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import {
  fetchAdminDashboard,
  updateAdminUser,
  type AdminDashboard,
} from "@/lib/admin";
import { changePassword } from "@/lib/account";
import { getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

type AdminProfileForm = {
  fullName: string;
  email: string;
  phone: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Session active";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Session active";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function AdminProfilPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<"account" | "password">("account");
  const [form, setForm] = useState<AdminProfileForm>({
    fullName: "",
    email: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  useEffect(() => {
    setForm({
      fullName: user?.full_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
  }, [user?.email, user?.full_name, user?.phone]);

  useEffect(() => {
    if (!token) return;
    let active = true;

    const load = async () => {
      try {
        const data = await fetchAdminDashboard(token);
        if (active) setDashboard(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Impossible de charger le profil.");
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.id, user?.profile_image_url]);

  const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return null;
    if (value.startsWith("http") || value.startsWith("data:")) return value;
    return `${getApiBaseUrl()}${value}`;
  };

  const name = form.fullName || user?.full_name || "Super admin";
  const email = form.email || user?.email || "admin@yeloo.ci";
  const phone = form.phone || user?.phone || "Non renseigné";
  const displayedAvatar = avatarLoadFailed ? null : avatarPreview ?? resolveAvatarUrl(user?.profile_image_url);
  const initials = useMemo(() => getInitials(name), [name]);

  const checklist = [
    { label: "Photo de profil", done: Boolean(displayedAvatar) },
    { label: "Nom complet", done: Boolean(form.fullName.trim()) },
    { label: "Email", done: Boolean(form.email.trim()) },
    { label: "Téléphone", done: Boolean(form.phone.trim()) },
    { label: "Accès admin", done: user?.role === "admin" },
  ];
  const completedCount = checklist.filter((item) => item.done).length;
  const completionPercent = Math.round((completedCount / checklist.length) * 100);

  const stats = [
    {
      label: "Utilisateurs",
      value: dashboard?.counts.total_users ?? 0,
      helper: "Comptes suivis",
      Icon: FiUsers,
    },
    {
      label: "Vérifications",
      value: dashboard?.counts.pending_owner_kyc ?? 0,
      helper: "En attente",
      Icon: FiClock,
    },
    {
      label: "Annonces",
      value: dashboard?.counts.total_properties ?? 0,
      helper: "Publications",
      Icon: FiActivity,
    },
  ];

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token || !user) return;
    if (!file.type.startsWith("image/")) {
      setError("Photo non supportée. Utilisez une image JPG, PNG ou WEBP.");
      event.target.value = "";
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setAvatarLoadFailed(false);

    const payload = new FormData();
    payload.append("file", file);
    const response = await fetch(`${getApiBaseUrl()}/api/users/me/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: payload,
    });

    if (!response.ok) {
      setAvatarPreview(null);
      setError("Impossible de mettre à jour la photo.");
      return;
    }

    const updated = await response.json();
    const resolved = resolveAvatarUrl(updated.profile_image_url);
    if (resolved) {
      setAvatarPreview(resolved);
      setAvatarLoadFailed(false);
    }
    setUser({ ...user, profile_image_url: updated.profile_image_url });
    setSuccess("Photo de profil mise à jour.");
  };

  const handleSave = async () => {
    if (!token || !user) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateAdminUser(token, user.id, {
        full_name: form.fullName.trim() || null,
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      });
      setUser({
        ...user,
        full_name: updated.full_name,
        email: updated.email,
        phone: updated.phone,
      });
      setSuccess("Profil super admin mis à jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!token) return;
    setError(null);
    setSuccess(null);
    if (passwordForm.next !== passwordForm.confirm) {
      setError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    setIsSavingPassword(true);
    try {
      await changePassword(token, passwordForm.current, passwordForm.next);
      setPasswordForm({ current: "", next: "", confirm: "" });
      setSuccess("Mot de passe mis Ã  jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mot de passe impossible Ã  modifier.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const fields = [
    {
      key: "fullName",
      label: "Nom complet",
      value: form.fullName,
      placeholder: "Votre nom",
      Icon: FiUser,
      type: "text",
    },
    {
      key: "email",
      label: "Email",
      value: form.email,
      placeholder: "admin@yeloo.ci",
      Icon: FiMail,
      type: "email",
    },
    {
      key: "phone",
      label: "Téléphone",
      value: form.phone,
      placeholder: "+225 ...",
      Icon: FiPhone,
      type: "tel",
    },
  ] as const;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-24 lg:ml-72 lg:px-10">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="space-y-6"
      >
        <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex w-full flex-col items-center text-center lg:max-w-sm">
              <div className="relative">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-neutral-300 text-3xl font-semibold text-white">
                  {displayedAvatar ? (
                    <img
                      src={displayedAvatar}
                      alt={name}
                      className="h-full w-full object-cover"
                      onError={() => {
                        setAvatarLoadFailed(true);
                        setAvatarPreview(null);
                      }}
                    />
                  ) : (
                    <span className="text-3xl font-bold leading-none tracking-normal">
                      {initials || "SA"}
                    </span>
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
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="mt-4 space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
                  {name}
                </h1>
                <p className="text-sm font-medium text-neutral-800">Super admin Yeloo+</p>
                <p className="text-sm text-neutral-600">Email: {email}</p>
                <div className="flex flex-wrap justify-center gap-2 pt-2 text-xs">
                  <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
                    Super admin vérifié
                  </span>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-600">
                    {completionPercent}% complété
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[430px]">
              {stats.map(({ label, value, helper, Icon }) => (
                <article key={label} className="rounded-[1.5rem] bg-neutral-50 p-4">
                  <Icon className="text-blue-600" />
                  <p className="mt-5 text-2xl font-semibold tracking-tight text-neutral-950">
                    {value}
                  </p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">{label}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{helper}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-6 flex gap-6 border-b border-neutral-200 text-sm">
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
        </section>

        {activeTab === "password" ? (
          <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-neutral-950">Changer le mot de passe</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Mettez Ã  jour votre accÃ¨s super admin en toute sÃ©curitÃ©.
            </p>
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
                      setPasswordForm((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70"
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
              {isSavingPassword ? "Sauvegarde..." : "Mettre Ã  jour"}
            </button>
            {success && (
              <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </p>
            )}
            {error && (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}
          </section>
        ) : (
        <section className="grid gap-6 xl:grid-cols-[1.8fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-950">
                    Informations générales
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Modifiez les informations publiques du compte super admin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-full bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {isSaving ? "Sauvegarde..." : "Enregistrer"}
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {fields.map(({ key, label, value, placeholder, Icon, type }) => (
                  <label key={key} className="block">
                    <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      <Icon className="text-neutral-400" />
                      {label}
                    </span>
                    <input
                      type={type}
                      value={value}
                      placeholder={placeholder}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, [key]: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70"
                    />
                  </label>
                ))}
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    <FiShield className="text-neutral-400" />
                    Rôle
                  </span>
                  <input
                    readOnly
                    value="Super admin"
                    className="w-full rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-800 outline-none ring-1 ring-black/5"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    <FiCheckCircle className="text-neutral-400" />
                    Statut
                  </span>
                  <input
                    readOnly
                    value={user?.is_verified ? "Actif et vérifié" : "Actif"}
                    className="w-full rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-800 outline-none ring-1 ring-black/5"
                  />
                </label>
              </div>

              {success && (
                <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </p>
              )}
              {error && (
                <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </p>
              )}
            </section>

            <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-950">Activité récente</h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Vue rapide des derniers mouvements.
                  </p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500">
                  {dashboard?.recent_activities.length ?? 0} événement(s)
                </span>
              </div>

              <div className="mt-5 divide-y divide-neutral-100">
                {(dashboard?.recent_activities ?? []).slice(0, 5).map((item) => (
                  <article key={item.id} className="flex items-start justify-between gap-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-neutral-950">{item.title}</p>
                      <p className="mt-1 text-sm text-neutral-500">{item.description}</p>
                    </div>
                    <p className="shrink-0 text-xs text-neutral-400">{formatDate(item.created_at)}</p>
                  </article>
                ))}
                {!dashboard?.recent_activities.length && (
                  <p className="py-4 text-sm text-neutral-500">
                    Aucune activité récente à afficher pour le moment.
                  </p>
                )}
              </div>
            </section>
          </div>

          <aside className="hidden space-y-6 xl:block">
            <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-neutral-950">
                    Profil {completedCount}/{checklist.length}
                  </p>
                  <p className="text-sm text-neutral-500">
                    Gardez un compte admin clair et identifiable.
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
                        item.done ? "bg-emerald-100 text-emerald-600" : "bg-neutral-100 text-neutral-400"
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
              <h2 className="text-base font-semibold text-neutral-950">Raccourcis</h2>
              <div className="mt-4 space-y-3">
                {[
                  { href: "/admin/users", label: "Gérer les utilisateurs", Icon: FiUsers },
                  { href: "/admin/verifications", label: "Vérifications KYC", Icon: FiCheckCircle },
                  { href: "/messages", label: "Conversations", Icon: FiMessageCircle },
                ].map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-800 ring-1 ring-black/5"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="text-neutral-500" />
                      {label}
                    </span>
                    <FiChevronRight className="text-neutral-300" />
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </section>
        )}
      </motion.section>
    </main>
  );
}
