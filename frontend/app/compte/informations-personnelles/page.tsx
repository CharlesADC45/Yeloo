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
import { AccountSidebar } from "@/components/AccountSidebar";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { updateMyAccount } from "@/lib/account";
import { getApiBaseUrl } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useAuthStore } from "@/stores/authStore";

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function InformationsPersonnellesPage() {
  const t = useT();
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
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

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

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.id, user?.profile_image_url]);

  const name = form.fullName || user?.full_name || "Commercial Test";
  const email = form.email || user?.email || "commercial@gimo.local";
  const phone = form.phone || user?.phone || "+2250700000001";
  const displayedAvatar = avatarLoadFailed ? null : resolveAvatarUrl(user?.profile_image_url);
  const initials = useMemo(() => getInitials(name), [name]);

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
      setMessage(`${t("personalInfo")} ${t("save").toLowerCase()}.`);
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

  const details = [
    { icon: FiUser, label: t("fullName"), value: name },
    { icon: FiPhone, label: t("phone"), value: phone },
    { icon: FiMail, label: "Email", value: email },
    { icon: FiCalendar, label: t("createdAt"), value: "26 février 2026" },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <AccountSidebar />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <Link
              href="/compte"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-soft"
            >
              <FiArrowLeft />
            </Link>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 lg:text-[2rem]">
                {t("personalInfo")}
              </h1>
              <p className="mt-1 text-sm text-neutral-600">
                {t("personalInfoSubtitle")}
              </p>
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
              {isEditing ? t("close") : t("edit")}
            </button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <aside className="hidden space-y-5 xl:block">
              <section className="hidden rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft xl:block">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-xl font-semibold text-white ring-4 ring-blue-100">
                      {displayedAvatar ? (
                        <img
                          src={displayedAvatar}
                          alt={name}
                          className="h-full w-full object-cover"
                          onError={() => setAvatarLoadFailed(true)}
                        />
                      ) : (
                        <span className="text-3xl font-bold leading-none tracking-normal">
                          {initials}
                        </span>
                      )}
                    </div>
                    <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 shadow-soft">
                      <FiCamera />
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-neutral-950">{name}</h2>
                  <p className="mt-1 text-sm text-neutral-500">{email}</p>
                  <p className="mt-1 text-sm text-neutral-400">{phone}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                      {t("active")}
                    </span>
                    {isVerified && (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                        {t("verified")}
                      </span>
                    )}
                    {isOwnerPending && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                        {t("pending")}
                      </span>
                    )}
                  </div>
                </div>
              </section>
            </aside>

            <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-soft lg:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">{t("accountDetails")}</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {t("accountDetailsSubtitle")}
                  </p>
                </div>
                <div className="hidden h-2 w-40 overflow-hidden rounded-full bg-blue-100 lg:block">
                  <div className="h-full w-full rounded-full bg-blue-500" />
                </div>
              </div>

              {isEditing ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    { key: "fullName", label: t("fullName"), icon: FiUser, value: form.fullName, type: "text" },
                    { key: "phone", label: t("phone"), icon: FiPhone, value: form.phone, type: "tel" },
                    { key: "email", label: "Email", icon: FiMail, value: form.email, type: "email" },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className={`block text-xs font-semibold uppercase tracking-wide text-neutral-500 ${
                        item.key === "email" ? "md:col-span-2" : ""
                      }`}
                    >
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
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 md:w-auto md:min-w-[12rem]"
                    >
                      {isSaving ? t("saving") : t("save")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {details.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-4 ring-1 ring-black/5"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 ring-1 ring-black/5">
                        <item.icon />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-neutral-500">{item.label}</p>
                        <p className="truncate font-semibold text-neutral-900">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {message && (
                <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                  {message}
                </p>
              )}
              {error && (
                <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-600">
                  {error}
                </p>
              )}
            </section>
          </div>
        </motion.section>
      </main>
      {bottomNav}
    </div>
  );
}
