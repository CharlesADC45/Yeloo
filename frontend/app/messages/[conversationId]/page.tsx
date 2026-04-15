"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiHome,
  FiInfo,
  FiMic,
  FiMoreVertical,
  FiPaperclip,
  FiPhone,
  FiSearch,
  FiSend,
  FiUser,
} from "react-icons/fi";
import { useParams, useSearchParams } from "next/navigation";
import { AdminSidebar } from "@/components/AdminSidebar";
import { BottomNav } from "@/components/BottomNav";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { TopBar } from "@/components/TopBar";
import {
  fetchConversation,
  fetchConversations,
  sendConversationMessage,
  type ConversationSummary,
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

function MessageConversationPageContent() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const params = useParams<{ conversationId?: string | string[] }>();
  const conversationId = useMemo(() => {
    const raw = params?.conversationId;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token || !conversationId) {
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
        const data = await fetchConversation(token, conversationId);
        if (!active) return;
        setConversation(data);
      } catch (err) {
        if (!active) return;
        if (!silent) {
          setError(err instanceof Error ? err.message : "Impossible de charger cette conversation.");
        }
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
  }, [conversationId, token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const load = () =>
      fetchConversations(token)
        .then((data) => {
          if (active) setConversations(data);
        })
        .catch(() => undefined);
    void load();
    const interval = window.setInterval(load, 20000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [token]);

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
  const isOwnerDashboard = user?.role === "proprietaire" && searchParams.get("mode") === "owner";
  const hasDashboardShell = isAdmin || isOwnerDashboard;
  const messageHrefSuffix = isOwnerDashboard ? "?mode=owner" : "";

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      {isAdmin && <AdminSidebar />}
      {isOwnerDashboard && <OwnerSidebar />}
      <main
        className={`mx-auto px-3 pt-24 sm:px-6 ${
          isAdmin
            ? "w-full pb-16 lg:ml-72 lg:max-w-[calc(100%-18rem)]"
            : isOwnerDashboard
              ? "w-full pb-16 lg:ml-64 lg:max-w-[calc(100%-16rem)]"
            : "max-w-7xl pb-28"
        }`}
      >
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden rounded-[2rem] bg-[#f7f8ff] lg:h-[calc(100svh-7.5rem)] lg:min-h-[620px]"
        >
          {isLoading ? (
            <div className="grid h-full gap-3 p-3 lg:grid-cols-[17rem_minmax(0,1fr)_16rem]">
              <div className="hidden rounded-[1.7rem] bg-white p-4 lg:block">
                <div className="h-10 animate-pulse rounded-2xl bg-neutral-100" />
                <div className="mt-5 space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
                  ))}
                </div>
              </div>
              <div className="rounded-[1.7rem] bg-white p-4">
                <div className="h-14 w-1/2 animate-pulse rounded-2xl bg-neutral-100" />
                <div className="mt-5 h-[460px] animate-pulse rounded-[1.6rem] bg-neutral-100" />
              </div>
              <div className="hidden rounded-[1.7rem] bg-white p-4 xl:block">
                <div className="h-8 animate-pulse rounded-xl bg-neutral-100" />
                <div className="mt-5 space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-12 animate-pulse rounded-xl bg-neutral-100" />
                  ))}
                </div>
              </div>
            </div>
          ) : conversation ? (
            <div className="grid h-full gap-3 p-3 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_16rem]">
              <aside className="hidden overflow-hidden rounded-[1.7rem] bg-white lg:block">
                <div className="p-4">
                  <label className="flex items-center gap-2 rounded-2xl bg-[#eef0ff] px-3 py-2.5 text-sm text-neutral-500">
                    <FiSearch />
                    <input
                      className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-neutral-500"
                      placeholder="Search"
                      readOnly
                    />
                  </label>
                </div>
                <div className="hide-scrollbar h-[calc(100%-4.5rem)] space-y-1 overflow-y-auto px-3 pb-3">
                  {(conversations.length ? conversations : [conversation]).map((item) => {
                    const initials = (item.counterpart_name || "Y")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    const active = item.id === conversation.id;

                    return (
                      <Link
                        key={item.id}
                        href={`/messages/${item.id}${messageHrefSuffix}`}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                          active ? "bg-[#eef0ff]" : "hover:bg-neutral-50"
                        }`}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-xs font-semibold text-white">
                          {initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-neutral-950">
                            {item.counterpart_name || "Interlocuteur"}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-neutral-500">
                            {item.last_message_preview || item.property_title}
                          </span>
                        </span>
                        {item.unread_count > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-semibold text-white">
                            {item.unread_count}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </aside>

              <section className="flex min-h-[calc(100svh-8rem)] flex-col overflow-hidden rounded-[1.7rem] bg-white lg:min-h-0">
                <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Link
                      href={`/messages${messageHrefSuffix}`}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700"
                      aria-label="Retour aux conversations"
                    >
                      <FiArrowLeft />
                    </Link>
                    <div className="min-w-0">
                      <h1 className="truncate text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
                        {conversation.counterpart_name || "Votre interlocuteur"}
                      </h1>
                      <p className="mt-0.5 truncate text-xs text-neutral-500 sm:text-sm">
                        {conversation.property_title} · {conversation.property_city}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600">
                    <button type="button" className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100 sm:inline-flex">
                      <FiSearch />
                    </button>
                    <button type="button" className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100 sm:inline-flex">
                      <FiPhone />
                    </button>
                    <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100">
                      <FiMoreVertical />
                    </button>
                  </div>
                </div>

                <div className="hide-scrollbar flex-1 space-y-4 overflow-y-auto bg-[#fafbff] px-4 py-5 sm:px-6">
                  {conversation.messages.length === 0 ? (
                    <div className="rounded-[1.4rem] bg-white px-4 py-6 text-sm text-neutral-600">
                      Aucun message pour le moment. Lancez la conversation.
                    </div>
                  ) : (
                    conversation.messages.map((message) => {
                      const isMine = message.sender_id === user?.id;
                      return (
                        <div key={message.id} className={`flex gap-3 ${isMine ? "justify-end" : "justify-start"}`}>
                          {!isMine && (
                            <span className="mt-6 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-xs font-semibold text-white sm:flex">
                              {counterpartInitials}
                            </span>
                          )}
                          <div className={`max-w-[86%] sm:max-w-[68%] ${isMine ? "items-end" : "items-start"}`}>
                            <div
                              className={`rounded-[1.35rem] px-4 py-3 text-sm shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${
                                isMine
                                  ? "rounded-br-md bg-[#6667f6] text-white"
                                  : "rounded-bl-md bg-[#eef0ff] text-neutral-900"
                              }`}
                            >
                              <p className="leading-6">{message.body}</p>
                            </div>
                            <p className={`mt-1 text-[11px] ${isMine ? "text-right text-neutral-400" : "text-neutral-400"}`}>
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-neutral-100 bg-white px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2 rounded-2xl bg-[#f2f3fb] px-3 py-2">
                    <button type="button" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-white">
                      <FiPaperclip />
                    </button>
                    <textarea
                      rows={1}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Votre message"
                      className="min-h-[42px] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
                    />
                    <button type="button" className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-white sm:inline-flex">
                      <FiMic />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={isSending || !draft.trim()}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6667f6] text-white transition hover:bg-[#5758e8] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiSend />
                    </button>
                  </div>
                </div>
              </section>

              <aside className="hidden space-y-3 xl:block">
                <section className="rounded-[1.7rem] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-neutral-950">Infos</h2>
                    <FiInfo className="text-neutral-400" />
                  </div>
                  <div className="mt-5 space-y-4 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef0ff] text-[#6667f6]">
                        <FiHome />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-neutral-950">{conversation.property_title}</p>
                        <p className="text-xs text-neutral-500">{conversation.property_city}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                        <FiUser />
                      </span>
                      <div>
                        <p className="font-semibold text-neutral-950">
                          {conversation.counterpart_name || "Interlocuteur"}
                        </p>
                        <p className="text-xs capitalize text-neutral-500">
                          {conversation.counterpart_role || "contact"}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="rounded-[1.7rem] bg-[#eef0ff] p-4">
                  <p className="text-sm font-semibold text-neutral-950">Conversation</p>
                  <p className="mt-2 text-xs leading-5 text-neutral-600">
                    Gardez les échanges liés à l'annonce ici pour retrouver facilement les détails.
                  </p>
                  <p className="mt-4 text-xs text-neutral-500">
                    Dernière activité: {formatTime(conversation.updated_at)}
                  </p>
                </section>
              </aside>
            </div>
          ) : (
            <div className="m-5 rounded-[1.4rem] bg-white px-4 py-6 text-sm text-neutral-600">
              Conversation introuvable.
            </div>
          )}

          {error && (
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

export default function MessageConversationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <MessageConversationPageContent />
    </Suspense>
  );
}
