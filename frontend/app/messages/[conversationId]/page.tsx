"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowLeft, FiSend } from "react-icons/fi";
import { useParams } from "next/navigation";
import { AdminSidebar } from "@/components/AdminSidebar";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import {
  fetchConversation,
  sendConversationMessage,
  type ConversationDetail,
} from "@/lib/messages";
import { useAuthStore } from "@/stores/authStore";

function formatTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation?.messages.length]);

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

  const counterpartInitials = (conversation?.counterpart_name || "Y")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      {isAdmin && <AdminSidebar />}
      <main
        className={`mx-auto bg-white px-4 pt-24 sm:px-8 ${
          isAdmin
            ? "w-full pb-16 lg:ml-72 lg:max-w-[calc(100%-18rem)]"
            : "max-w-6xl pb-28"
        }`}
      >
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          <Link
            href="/messages"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700"
          >
            <FiArrowLeft />
            Retour aux conversations
          </Link>

          <section className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-white">
            {isLoading ? (
              <div className="space-y-3 p-5 sm:p-6">
                <div className="h-14 w-1/2 animate-pulse rounded-2xl bg-neutral-100" />
                <div className="h-[420px] animate-pulse rounded-[1.6rem] bg-neutral-100" />
              </div>
            ) : conversation ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                      {counterpartInitials}
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold text-neutral-900 sm:text-xl">
                        {conversation.counterpart_name || "Votre interlocuteur"}
                      </h1>
                      <p className="mt-0.5 text-sm text-neutral-500">
                        {conversation.property_title} · {conversation.property_city}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                    Conversation active
                  </div>
                </div>

                <div className="bg-[radial-gradient(circle_at_top,_rgba(47,87,255,0.06),_transparent_42%),linear-gradient(180deg,#F8FBFF_0%,#FFFFFF_100%)] px-4 py-5 sm:px-6">
                  <div className="space-y-3 rounded-[1.8rem] border border-neutral-200/80 bg-white/80 p-4 backdrop-blur-sm sm:p-5">
                    {conversation.messages.length === 0 ? (
                      <div className="rounded-[1.4rem] bg-neutral-50 px-4 py-6 text-sm text-neutral-600">
                        Aucun message pour le moment. Lancez la conversation.
                      </div>
                    ) : (
                      conversation.messages.map((message) => {
                        const isMine = message.sender_id === user?.id;
                        return (
                          <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[88%] rounded-[1.45rem] px-4 py-3 text-sm shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:max-w-[72%] ${
                                isMine
                                  ? "rounded-br-md bg-blue-600 text-white"
                                  : "rounded-bl-md border border-neutral-200 bg-white text-neutral-800"
                              }`}
                            >
                              <p className="leading-6">{message.body}</p>
                              <p className={`mt-2 text-[11px] ${isMine ? "text-white/70" : "text-neutral-400"}`}>
                                {formatTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <div className="border-t border-neutral-100 px-4 py-4 sm:px-6">
                  <div className="flex items-end gap-3 rounded-[1.6rem] border border-neutral-200 bg-white p-3">
                    <textarea
                      rows={1}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Écrire un message..."
                      className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={isSending || !draft.trim()}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiSend className="text-lg" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="m-5 rounded-[1.4rem] bg-neutral-50 px-4 py-6 text-sm text-neutral-600">
                Conversation introuvable.
              </div>
            )}

            {error && (
              <div className="m-5 rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </section>
        </motion.section>
      </main>
      {!isAdmin && <BottomNav />}
    </div>
  );
}
