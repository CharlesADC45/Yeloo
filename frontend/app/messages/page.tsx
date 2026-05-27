"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { FiMoreVertical, FiSearch } from "react-icons/fi";
import { AdminSidebar } from "@/components/AdminSidebar";
import { BottomNav } from "@/components/BottomNav";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { TopBar } from "@/components/TopBar";
import { getApiBaseUrl } from "@/lib/api";
import { fetchConversations, type ConversationSummary } from "@/lib/messages";
import { useAuthStore } from "@/stores/authStore";

function getInitials(value?: string | null) {
  const parts = (value || "Y")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "Y";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatConversationTime(value: string) {
  return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function resolveMediaUrl(value?: string | null) {
  if (!value) return null;
  if (value.startsWith("http") || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }
  return `${getApiBaseUrl()}${value.startsWith("/") ? value : `/${value}`}`;
}

function MessagesPageContent() {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isOwnerMode = searchParams.get("mode") === "owner";
  const isAdmin = user?.role === "admin";
  const isOwnerDashboard = user?.role === "proprietaire" && isOwnerMode;
  const hasDashboardShell = isAdmin || isOwnerDashboard;
  const messageHrefSuffix = isOwnerMode ? "?mode=owner" : "";

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let active = true;
    const load = async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const data = await fetchConversations(token);
        if (active) setItems(data);
      } catch (err) {
        if (!active || silent) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les conversations.");
      } finally {
        if (active && !silent) setIsLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => void load(true), 20000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [token]);

  useEffect(() => {
    if (isLoading || items.length === 0) return;
    if (typeof window === "undefined" || window.innerWidth < 1024) return;
    router.replace(`/messages/${items[0].id}${messageHrefSuffix}`);
  }, [isLoading, items, messageHrefSuffix, router]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      [
        item.counterpart_name,
        item.property_title,
        item.property_city,
        item.last_message_preview,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized))
    );
  }, [items, query]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto max-w-xl px-4 pb-28 pt-24">
          <section className="rounded-[2rem] border border-neutral-200 bg-white p-6">
            <h1 className="text-xl font-semibold">Messagerie</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Connectez-vous pour retrouver vos conversations avec les proprietaires.
            </p>
            <Link
              href="/connexion?next=/messages"
              className="mt-4 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Se connecter
            </Link>
          </section>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar adminShell={isAdmin} ownerShell={isOwnerDashboard} />
      {isAdmin && <AdminSidebar />}
      {isOwnerDashboard && <OwnerSidebar />}
      <main
        className={`mx-auto h-[calc(100svh-5rem)] overflow-hidden px-0 pt-20 sm:px-4 sm:pt-24 ${
          isAdmin
            ? "w-full lg:ml-72 lg:max-w-[calc(100%-18rem)]"
            : isOwnerDashboard
              ? "w-full lg:ml-64 lg:max-w-[calc(100%-16rem)]"
              : "max-w-[54rem]"
        }`}
      >
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex h-full min-h-0 flex-col overflow-hidden border border-neutral-200 bg-white sm:rounded-[1.5rem]"
        >
          <div className="shrink-0 border-b border-neutral-100 bg-white px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Chats</h1>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
                aria-label="Options"
              >
                <FiMoreVertical />
              </button>
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-full bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
              <FiSearch className="shrink-0 text-lg" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-500"
                placeholder="Rechercher ou demarrer un chat"
              />
            </label>
          </div>

          {isLoading ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-24 sm:p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-neutral-100" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="m-4 rounded-[1.4rem] bg-neutral-50 px-4 py-6 text-sm text-neutral-600">
              Aucune conversation pour le moment.
            </div>
          ) : (
            <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto pb-24">
              <div className="divide-y divide-neutral-100">
                {filteredItems.map((item) => {
                  const avatarUrl = resolveMediaUrl(item.counterpart_avatar_url);
                  return (
                    <Link
                      key={item.id}
                      href={`/messages/${item.id}${messageHrefSuffix}`}
                      className="flex items-center gap-4 px-4 py-4 transition hover:bg-neutral-50 sm:px-6"
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={item.counterpart_name || "Contact"}
                          className="h-12 w-12 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">
                          {getInitials(item.counterpart_name)}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-semibold uppercase text-neutral-950">
                              {item.counterpart_name || "Interlocuteur"}
                            </span>
                            <span className="mt-1 block truncate text-sm text-neutral-500">
                              {item.last_message_preview || item.property_title}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-xs text-neutral-400">
                              {formatConversationTime(item.updated_at)}
                            </span>
                            {item.unread_count > 0 && (
                              <span className="mt-2 inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
                                {item.unread_count}
                              </span>
                            )}
                          </span>
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {!isLoading && error && (
            <div className="m-4 rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </motion.section>
      </main>
      {!hasDashboardShell && <BottomNav />}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <MessagesPageContent />
    </Suspense>
  );
}
