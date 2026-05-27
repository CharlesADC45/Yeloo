"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiAlertTriangle,
  FiCheck,
  FiDownload,
  FiInfo,
  FiMic,
  FiMoreVertical,
  FiPaperclip,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiSmile,
  FiTrash2,
  FiVideo,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import { useParams, useSearchParams } from "next/navigation";
import { AdminSidebar } from "@/components/AdminSidebar";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { TopBar } from "@/components/TopBar";
import { getApiBaseUrl } from "@/lib/api";
import {
  fetchConversation,
  fetchConversations,
  sendConversationAttachment,
  sendConversationMessage,
  type ChatMessage,
  type ConversationDetail,
  type ConversationSummary,
} from "@/lib/messages";
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

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatConversationTime(value: string) {
  return formatMessageTime(value);
}

const isImageAttachment = (message: ChatMessage) =>
  Boolean(message.attachment_url && message.attachment_type?.startsWith("image/"));

const isVideoAttachment = (message: ChatMessage) =>
  Boolean(message.attachment_url && message.attachment_type?.startsWith("video/"));

const quickEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const composerEmojis = ["😀", "😂", "😍", "😎", "👍", "🙏", "❤️", "🔥", "🎉", "✅", "🏠", "📅"];

function resolveMediaUrl(value?: string | null) {
  if (!value) return null;
  if (value.startsWith("http") || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }
  return `${getApiBaseUrl()}${value.startsWith("/") ? value : `/${value}`}`;
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
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null);
  const [conversationQuery, setConversationQuery] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedReactionMessageId, setSelectedReactionMessageId] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const isOwnerMode = searchParams.get("mode") === "owner";
  const isAdmin = user?.role === "admin";
  const isOwnerDashboard = user?.role === "proprietaire" && isOwnerMode;
  const messageHrefSuffix = isOwnerMode ? "?mode=owner" : "";

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

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const appendMessage = (message: ChatMessage) => {
    setConversation((current) =>
      current
        ? {
            ...current,
            messages: [...current.messages, message],
            last_message_preview: message.body || message.attachment_name || "Piece jointe",
            updated_at: message.created_at,
          }
        : current
    );
  };

  const handleSend = async () => {
    if (!token || !conversationId || !draft.trim()) return;
    setIsSending(true);
    setError(null);
    try {
      const message = await sendConversationMessage(token, conversationId, draft.trim());
      appendMessage(message);
      setDraft("");
      setIsEmojiPickerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer le message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token || !conversationId) return;
    setIsUploadingAttachment(true);
    setError(null);
    try {
      const message = await sendConversationAttachment(token, conversationId, file);
      appendMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer la piece jointe.");
    } finally {
      setIsUploadingAttachment(false);
      event.target.value = "";
    }
  };

  const showComingSoon = () => {
    setToastMessage("Feature coming soon.");
    setIsMenuOpen(false);
  };

  const insertComposerEmoji = (emoji: string) => {
    setDraft((current) => `${current}${emoji}`);
  };

  const reactToMessage = (messageId: string, emoji: string) => {
    setMessageReactions((current) => ({ ...current, [messageId]: emoji }));
    setSelectedReactionMessageId(null);
  };

  const renderedConversations = conversations.length ? conversations : conversation ? [conversation] : [];
  const filteredConversations = useMemo(() => {
    const normalized = conversationQuery.trim().toLowerCase();
    if (!normalized) return renderedConversations;
    return renderedConversations.filter((item) =>
      [
        item.counterpart_name,
        item.property_title,
        item.property_city,
        item.last_message_preview,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized))
    );
  }, [conversationQuery, renderedConversations]);
  const counterpartInitials = getInitials(conversation?.counterpart_name);
  const menuActions = [
    { label: "Detail info", icon: FiInfo, action: () => setIsDetailsOpen(true) },
    { label: "Search", icon: FiSearch, action: showComingSoon },
    { label: "Report", icon: FiAlertTriangle, action: showComingSoon },
    { label: "Delete chat", icon: FiTrash2, action: showComingSoon, danger: true },
    { label: "Clear chat", icon: FiRefreshCw, action: showComingSoon },
    { label: "Close chat", icon: FiXCircle, action: showComingSoon },
  ];
  const counterpartAvatarUrl = resolveMediaUrl(conversation?.counterpart_avatar_url);

  return (
    <div className="h-[100svh] max-w-full overflow-hidden bg-white">
      <TopBar adminShell={isAdmin} ownerShell={isOwnerDashboard} />
      {isAdmin && <AdminSidebar />}
      {isOwnerDashboard && <OwnerSidebar />}
      <main
        className={`fixed inset-x-0 bottom-0 top-20 mx-auto max-w-full overflow-hidden px-0 sm:top-24 sm:px-4 ${
          isAdmin
            ? "w-full pb-0 lg:ml-72 lg:max-w-[calc(100%-18rem)]"
            : isOwnerDashboard
              ? "w-full pb-0 lg:ml-64 lg:max-w-[calc(100%-16rem)]"
              : "max-w-[92rem] pb-0"
        }`}
      >
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="h-full min-h-0 overflow-hidden border border-neutral-200 bg-white sm:rounded-[1.25rem]"
        >
          {isLoading ? (
            <div className="grid h-full min-w-0 lg:grid-cols-[22rem_minmax(0,1fr)]">
              <div className="hidden border-r border-neutral-200 bg-white p-4 lg:block">
                <div className="h-10 animate-pulse rounded-full bg-neutral-100" />
                <div className="mt-5 space-y-3">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-xl bg-neutral-100" />
                  ))}
                </div>
              </div>
              <div className="flex min-h-[calc(100svh-5rem)] flex-col bg-[#f7f8ff]">
                <div className="h-16 animate-pulse bg-neutral-100" />
                <div className="flex-1 p-5">
                  <div className="h-full animate-pulse rounded-2xl bg-white/50" />
                </div>
              </div>
            </div>
          ) : conversation ? (
            <div className="grid h-full lg:grid-cols-[22rem_minmax(0,1fr)]">
              <aside className="hidden border-r border-neutral-200 bg-white lg:flex lg:min-h-0 lg:flex-col">
                <div className="border-b border-neutral-100 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold text-neutral-950">Chats</h2>
                    <button
                      type="button"
                      onClick={showComingSoon}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
                      aria-label="Options"
                    >
                      <FiMoreVertical />
                    </button>
                  </div>
                  <label className="mt-4 flex items-center gap-3 rounded-full bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
                    <FiSearch className="shrink-0 text-lg" />
                    <input
                      value={conversationQuery}
                      onChange={(event) => setConversationQuery(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-500"
                      placeholder="Rechercher ou demarrer un chat"
                    />
                  </label>
                </div>

                <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto py-2">
                  {filteredConversations.length === 0 ? (
                    <div className="mx-3 rounded-2xl bg-neutral-50 px-4 py-5 text-sm text-neutral-600">
                      Aucune conversation trouvee.
                    </div>
                  ) : (
                    filteredConversations.map((item) => {
                    const active = item.id === conversation.id;
                    const avatarUrl = resolveMediaUrl(item.counterpart_avatar_url);
                    return (
                      <Link
                        key={item.id}
                        href={`/messages/${item.id}${messageHrefSuffix}`}
                        className={`flex items-center gap-3 px-4 py-3 transition ${
                          active ? "bg-neutral-100" : "hover:bg-neutral-50"
                        }`}
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
                        <span className="min-w-0 flex-1 border-b border-neutral-100 pb-3">
                          <span className="flex items-start justify-between gap-3">
                            <span className="min-w-0">
                              <span className="block truncate text-[15px] font-semibold text-neutral-950">
                                {item.counterpart_name || "Interlocuteur"}
                              </span>
                              <span className="mt-0.5 block truncate text-sm text-neutral-500">
                                {item.last_message_preview || item.property_title}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block text-xs text-neutral-400">
                                {formatConversationTime(item.updated_at)}
                              </span>
                              {item.unread_count > 0 && (
                                <span className="mt-1 inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
                                  {item.unread_count}
                                </span>
                              )}
                            </span>
                          </span>
                        </span>
                      </Link>
                    );
                    })
                  )}
                </div>
              </aside>

              <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
                <div className="relative flex h-16 max-w-full shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-white px-2 shadow-sm sm:gap-3 sm:px-5">
                  <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <Link
                      href={`/messages${messageHrefSuffix}`}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
                      aria-label="Retour"
                    >
                      <FiArrowLeft />
                    </Link>
                    {counterpartAvatarUrl ? (
                      <img
                        src={counterpartAvatarUrl}
                        alt={conversation.counterpart_name || "Contact"}
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">
                        {counterpartInitials}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsDetailsOpen(true)}
                      className="min-w-0 text-left"
                    >
                      <h1 className="truncate text-base font-semibold text-neutral-950">
                        {conversation.counterpart_name || "Votre interlocuteur"}
                      </h1>
                      <p className="truncate text-xs text-neutral-500">
                        {conversation.property_title} - {conversation.property_city}
                      </p>
                    </button>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-neutral-700">
                    <button
                      type="button"
                      onClick={showComingSoon}
                      className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100 sm:inline-flex"
                      aria-label="Video"
                    >
                      <FiVideo />
                    </button>
                    <button
                      type="button"
                      onClick={showComingSoon}
                      className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100 sm:inline-flex"
                      aria-label="Appel"
                    >
                      <FiPhone />
                    </button>
                    <button
                      type="button"
                      onClick={showComingSoon}
                      className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100 sm:inline-flex"
                      aria-label="Rechercher"
                    >
                      <FiSearch />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen((current) => !current)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100"
                      aria-label="Options"
                    >
                      <FiMoreVertical />
                    </button>
                  </div>
                  {isMenuOpen && (
                    <div className="absolute right-3 top-14 z-30 w-64 overflow-hidden rounded-2xl border border-neutral-200 bg-white py-2 shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
                      {menuActions.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            item.action();
                            if (item.label !== "Close chat") setIsMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-neutral-50 ${
                            "danger" in item && item.danger ? "text-red-600" : "text-neutral-800"
                          }`}
                        >
                          <item.icon className="text-lg" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className="hide-scrollbar flex-1 space-y-2 overflow-y-auto px-3 py-5 sm:px-8"
                  style={{
                    backgroundColor: "#f7f8ff",
                    backgroundImage:
                      "radial-gradient(circle at 24px 24px, rgba(47,87,255,0.08) 1.5px, transparent 2px), radial-gradient(circle at 88px 72px, rgba(15,23,42,0.05) 1px, transparent 2px)",
                    backgroundSize: "112px 112px",
                  }}
                >
                  <div className="mx-auto mb-4 w-fit rounded-lg bg-white/80 px-3 py-1 text-xs font-medium text-neutral-500 shadow-sm">
                    Aujourd'hui
                  </div>
                  {conversation.messages.length === 0 ? (
                    <div className="mx-auto max-w-md rounded-xl bg-white/90 px-4 py-4 text-center text-sm text-neutral-600 shadow-sm">
                      Aucun message pour le moment. Lancez la conversation.
                    </div>
                  ) : (
                    conversation.messages.map((message) => {
                      const isMine = message.sender_id === user?.id;
                      const attachmentUrl = resolveMediaUrl(message.attachment_url);
                      return (
                        <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div
                            onClick={() =>
                              setSelectedReactionMessageId((current) =>
                                current === message.id ? null : message.id
                              )
                            }
                            className={`max-w-[88%] rounded-lg px-3 py-2 text-[15px] leading-6 shadow-sm sm:max-w-[66%] ${
                              isMine
                                ? "rounded-tr-none bg-blue-600 text-white"
                                : "rounded-tl-none bg-white text-neutral-950"
                            } relative cursor-pointer`}
                          >
                            {selectedReactionMessageId === message.id && (
                              <div
                                className={`absolute z-20 flex gap-1 rounded-full border border-neutral-200 bg-white p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.16)] ${
                                  isMine ? "bottom-full right-0 mb-2" : "bottom-full left-0 mb-2"
                                }`}
                                onClick={(event) => event.stopPropagation()}
                              >
                                {quickEmojis.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => reactToMessage(message.id, emoji)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-neutral-100"
                                    aria-label={`Reagir avec ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                            {isImageAttachment(message) && attachmentUrl ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setImagePreview({
                                    url: attachmentUrl,
                                    name: message.attachment_name || "Image",
                                  });
                                }}
                                className="mb-2 block overflow-hidden rounded-md text-left"
                                aria-label="Ouvrir l'image"
                              >
                                <img
                                  src={attachmentUrl}
                                  alt={message.attachment_name || "Image envoyee"}
                                  className="max-h-80 w-full object-cover"
                                />
                              </button>
                            ) : null}
                            {isVideoAttachment(message) && attachmentUrl ? (
                              <video
                                className="mb-2 max-h-80 w-full rounded-md object-cover"
                                src={attachmentUrl}
                                onClick={(event) => event.stopPropagation()}
                                controls
                              />
                            ) : null}
                            {attachmentUrl && !isImageAttachment(message) && !isVideoAttachment(message) ? (
                              <a
                                href={attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => event.stopPropagation()}
                                className="mb-2 flex items-center gap-3 rounded-lg bg-black/5 px-3 py-3"
                              >
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-700">
                                  <FiDownload />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold">
                                    {message.attachment_name || "Piece jointe"}
                                  </span>
                                  <span className="block text-xs text-neutral-500">
                                    {message.attachment_type || "Fichier"}
                                  </span>
                                </span>
                              </a>
                            ) : null}
                            {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                            <div className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${isMine ? "text-white/75" : "text-neutral-500"}`}>
                              {messageReactions[message.id] && (
                                <span className="mr-auto rounded-full bg-white px-1.5 py-0.5 text-sm leading-none text-neutral-900 shadow-sm">
                                  {messageReactions[message.id]}
                                </span>
                              )}
                              <span>{formatMessageTime(message.created_at)}</span>
                              {isMine && <FiCheck className="text-white/80" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="relative max-w-full shrink-0 border-t border-neutral-200 bg-white px-2 py-3 sm:px-5">
                  {isEmojiPickerOpen && (
                    <div className="absolute bottom-[4.4rem] left-12 z-20 grid w-64 grid-cols-6 gap-1 rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)] sm:left-16">
                      {composerEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => insertComposerEmoji(emoji)}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-xl hover:bg-neutral-100"
                          aria-label={`Ajouter ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex min-w-0 items-end gap-2">
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={isUploadingAttachment}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
                      aria-label="Ajouter une piece jointe"
                    >
                      {isUploadingAttachment ? (
                        <FiPaperclip className="animate-pulse" />
                      ) : (
                        <FiPlus />
                      )}
                    </button>
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      accept="image/*,video/*,audio/*,application/pdf"
                      onChange={handleAttachmentChange}
                      className="hidden"
                    />
                    <div className="flex min-h-11 min-w-0 flex-1 items-end gap-2 rounded-full bg-neutral-100 px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => setIsEmojiPickerOpen((current) => !current)}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl text-neutral-500 hover:bg-neutral-100"
                        aria-label="Emoji"
                      >
                        <FiSmile />
                      </button>
                      <textarea
                        rows={1}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void handleSend();
                          }
                        }}
                        placeholder="Tapez un message"
                        className="max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-[15px] text-neutral-900 outline-none placeholder:text-neutral-500"
                      />
                    </div>
                    {draft.trim() ? (
                      <button
                        type="button"
                        onClick={() => void handleSend()}
                        disabled={isSending}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Envoyer"
                      >
                        <FiSend />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={showComingSoon}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-neutral-600 hover:bg-neutral-100"
                        aria-label="Message vocal"
                      >
                        <FiMic />
                      </button>
                    )}
                  </div>
                </div>
              </section>
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

          {toastMessage && (
            <div className="fixed left-1/2 top-24 z-[1400] -translate-x-1/2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,23,42,0.22)]">
              {toastMessage}
            </div>
          )}

          {imagePreview && (
            <div className="fixed inset-0 z-[1300] flex flex-col bg-black/95">
              <div className="flex h-16 shrink-0 items-center justify-between gap-3 px-4 text-white sm:px-6">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{imagePreview.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={imagePreview.url}
                    download={imagePreview.name}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
                    aria-label="Telecharger l'image"
                  >
                    <FiDownload />
                  </a>
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
                    aria-label="Fermer l'image"
                  >
                    <FiX />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6"
                aria-label="Fermer l'image"
              >
                <img
                  src={imagePreview.url}
                  alt={imagePreview.name}
                  className="max-h-full max-w-full object-contain"
                />
              </button>
            </div>
          )}

          {conversation && isDetailsOpen && (
            <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/30 p-3 backdrop-blur-sm sm:items-center sm:p-6">
              <div className="w-full max-w-md rounded-[1.8rem] bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {counterpartAvatarUrl ? (
                      <img
                        src={counterpartAvatarUrl}
                        alt={conversation.counterpart_name || "Contact"}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-950 text-lg font-semibold text-white">
                        {counterpartInitials}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-neutral-950">
                        {conversation.counterpart_name || "Interlocuteur"}
                      </p>
                      <p className="text-sm capitalize text-neutral-500">
                        {conversation.counterpart_role || "contact"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDetailsOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"
                    aria-label="Fermer les details"
                  >
                    <FiX />
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {conversation.property_image_url ? (
                    <img
                      src={conversation.property_image_url}
                      alt={conversation.property_title}
                      className="h-40 w-full rounded-[1.4rem] object-cover"
                    />
                  ) : null}
                  <Link
                    href={`/logements/${conversation.property_id}`}
                    className="block rounded-2xl bg-neutral-50 px-4 py-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Logement
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-neutral-950">
                      {conversation.property_title}
                    </p>
                    <p className="text-xs text-neutral-500">{conversation.property_city}</p>
                  </Link>
                  {conversation.counterpart_phone ? (
                    <div className="rounded-2xl bg-neutral-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                        Telephone
                      </p>
                      <p className="mt-1 text-sm font-semibold text-neutral-950">
                        {conversation.counterpart_phone}
                      </p>
                    </div>
                  ) : null}
                  {conversation.counterpart_email ? (
                    <div className="rounded-2xl bg-neutral-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                        Email
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-neutral-950">
                        {conversation.counterpart_email}
                      </p>
                    </div>
                  ) : null}
                  <p className="rounded-2xl bg-blue-50 px-4 py-3 text-xs text-blue-700">
                    Derniere activite : {formatConversationTime(conversation.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.section>
      </main>
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
