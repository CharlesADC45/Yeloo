"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowRight, FiMessageCircle } from "react-icons/fi";
import { AdminSidebar } from "@/components/AdminSidebar";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { fetchConversations, type ConversationSummary } from "@/lib/messages";
import { useAuthStore } from "@/stores/authStore";

function formatTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchConversations(token);
        if (!active) return;
        setItems(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les conversations.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [token]);

  const unreadCount = useMemo(
    () => items.reduce((sum, item) => sum + item.unread_count, 0),
    [items]
  );
  const isAdmin = user?.role === "admin";

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto max-w-xl px-4 pb-28 pt-24">
          <section className="rounded-[2rem] border border-neutral-200 bg-white p-6">
            <h1 className="text-xl font-semibold">Messagerie</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Connectez-vous pour retrouver vos conversations avec les propriétaires.
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
      <TopBar />
      {isAdmin && <AdminSidebar />}
      <main
        className={`mx-auto bg-white px-4 pt-24 sm:px-8 ${
          isAdmin
            ? "w-full pb-16 lg:ml-72 lg:max-w-[calc(100%-18rem)]"
            : "max-w-5xl pb-28"
        }`}
      >
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="rounded-[2rem] border-neutral-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Messages</h1>
                {/* <p className="mt-2 text-sm text-neutral-600">
                  Retrouvez vos conversations liées aux annonces Yeloo.
                </p> */}
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-blue-50 p-2 text-sm font-semibold text-blue-700">
                  {unreadCount} non lu(s)
                </span>
                <span className="rounded-full border border-neutral-200 px-4 py-2 text-sm text-neutral-500">
                  {items.length} conversation(s)
                </span>
              </div>
            </div>
          </div>

          <section className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-white">
            {isLoading ? (
              <div className="space-y-3 p-4 sm:p-5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-[1.4rem] bg-neutral-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="m-4 rounded-[1.4rem] bg-neutral-50 px-4 py-6 text-sm text-neutral-600">
                Aucune conversation pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {items.map((item) => {
                  const initials = (item.counterpart_name || "Y")
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <Link
                      key={item.id}
                      href={`/messages/${item.id}`}
                      className="group flex items-center gap-4 px-4 py-4 transition hover:bg-[#F8FAFF] sm:px-5"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold text-neutral-900">
                              {item.counterpart_name || "Interlocuteur"}
                            </p>
                            <p className="mt-0.5 truncate text-sm text-neutral-500">{item.property_title}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs text-neutral-400">{formatTime(item.updated_at)}</p>
                            {item.unread_count > 0 && (
                              <span className="mt-2 inline-flex min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white">
                                {item.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600">
                            {item.property_city}
                          </span>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium capitalize text-blue-700">
                            {item.counterpart_role || "contact"}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <p className="line-clamp-1 flex-1 text-sm text-neutral-500">
                            {item.last_message_preview || "Aucun message envoyé pour le moment."}
                          </p>
                          <FiArrowRight className="shrink-0 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {error && (
              <div className="m-4 rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </section>

          {/* <section className="rounded-[2rem] border border-neutral-200 bg-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <FiMessageCircle className="text-xl" />
              </div>
              <div>
                <p className="text-base font-semibold text-neutral-900">Chat Yeloo v1</p>
                <p className="mt-1 text-sm text-neutral-600">
                  Le design est maintenant plus proche de Telegram, mais le moteur actuel reste une
                  messagerie interne Yeloo — Matrix n’est pas encore branché.
                </p>
              </div>
            </div>
          </section> */}
        </motion.section>
      </main>
      {!isAdmin && <BottomNav />}
    </div>
  );
}
