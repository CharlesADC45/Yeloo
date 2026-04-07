"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import {
  fetchConversation,
  sendConversationMessage,
  type ConversationDetail,
} from "@/lib/messages";
import { useAuthStore } from "@/stores/authStore";

export default function MessageConversationPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const params = useParams<{ conversationId?: string | string[] }>();
  const conversationId = useMemo(() => {
    const raw = params?.conversationId;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !conversationId) {
      setIsLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchConversation(token, conversationId);
        if (!active) return;
        setConversation(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Impossible de charger cette conversation.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [conversationId, token]);

  const handleSend = async () => {
    if (!token || !conversationId || !draft.trim()) return;
    setIsSending(true);
    setError(null);
    try {
      const message = await sendConversationMessage(token, conversationId, draft.trim());
      setConversation((current) =>
        current
          ? {
              ...current,
              messages: [...current.messages, message],
              last_message_preview: message.body,
              updated_at: message.created_at,
            }
          : current
      );
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer le message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-24 sm:px-8">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-5">
          <Link href="/messages" className="inline-flex rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">
            Retour aux conversations
          </Link>

          <section className="rounded-[2rem] border border-neutral-200 bg-white p-4 shadow-soft sm:p-6">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-10 w-1/3 animate-pulse rounded-xl bg-neutral-100" />
                <div className="h-64 animate-pulse rounded-[1.4rem] bg-neutral-100" />
              </div>
            ) : conversation ? (
              <>
                <div className="border-b border-neutral-100 pb-4">
                  <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                    {conversation.property_title}
                  </h1>
                  <p className="mt-2 text-sm text-neutral-600">
                    Conversation avec {conversation.counterpart_name || "votre interlocuteur"} • {conversation.property_city}
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {conversation.messages.map((message) => {
                    const isMine = message.sender_id === user?.id;
                    return (
                      <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-[1.4rem] px-4 py-3 text-sm ${
                          isMine ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-800"
                        }`}>
                          <p>{message.body}</p>
                          <p className={`mt-2 text-[11px] ${isMine ? "text-white/70" : "text-neutral-400"}`}>
                            {new Date(message.created_at).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <textarea
                    rows={3}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Écrire un message…"
                    className="min-h-[90px] flex-1 rounded-[1.4rem] border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={isSending || !draft.trim()}
                    className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                  >
                    {isSending ? "Envoi..." : "Envoyer"}
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-[1.4rem] bg-neutral-50 px-4 py-6 text-sm text-neutral-600">
                Conversation introuvable.
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
