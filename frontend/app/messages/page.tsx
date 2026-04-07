"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { fetchConversations, type ConversationSummary } from "@/lib/messages";
import { useAuthStore } from "@/stores/authStore";

export default function MessagesPage() {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent">
        <TopBar />
        <main className="mx-auto max-w-xl px-4 pb-28 pt-24">
          <section className="rounded-3xl bg-white p-6 shadow-soft">
            <h1 className="text-xl font-semibold">Messagerie</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Connectez-vous pour retrouver vos conversations avec les propriétaires.
            </p>
            <Link href="/connexion?next=/messages" className="mt-4 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
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
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-24 sm:px-8">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
          <div className="rounded-[2rem] bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Messages</h1>
                <p className="mt-2 text-sm text-neutral-600">
                  Retrouvez vos conversations liées aux annonces Yeloo.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                {unreadCount} non lu(s)
              </span>
            </div>
          </div>

          <section className="rounded-[2rem] border border-neutral-200 bg-white p-4 shadow-soft sm:p-6">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-[1.4rem] bg-neutral-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-[1.4rem] bg-neutral-50 px-4 py-6 text-sm text-neutral-600">
                Aucune conversation pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/messages/${item.id}`}
                    className="flex flex-wrap items-start justify-between gap-4 rounded-[1.4rem] border border-neutral-200 bg-neutral-50 p-4 transition hover:bg-neutral-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-900">{item.property_title}</p>
                      <p className="mt-1 text-sm text-neutral-600">
                        {item.counterpart_name || "Interlocuteur"} • {item.property_city}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-neutral-500">
                        {item.last_message_preview || "Aucun message envoyé pour le moment."}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-500">
                        {new Date(item.updated_at).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {item.unread_count > 0 && (
                        <p className="mt-2 text-xs font-semibold text-blue-700">
                          {item.unread_count} nouveau(x)
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </section>
        </motion.section>
      </main>
      <BottomNav />
    </div>
  );
}
