"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiMessageCircle, FiWifi, FiWifiOff } from "react-icons/fi";
import { getApiBaseUrl } from "@/lib/api";
import { showDeviceNotification } from "@/lib/deviceNotifications";
import { fetchConversations, type ConversationSummary } from "@/lib/messages";
import { fetchPublicModules } from "@/lib/modules";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";

type ConnectionState = "online" | "offline" | "unstable";

type ToastState = {
  id: string;
  type: ConnectionState | "message";
  title: string;
  message: string;
};

const HEALTH_TIMEOUT_MS = 4500;
const UNSTABLE_LATENCY_MS = 3000;

async function checkApiHealth() {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiBaseUrl()}/health`, {
      cache: "no-store",
      signal: controller.signal,
    });
    const latency = performance.now() - startedAt;
    return {
      ok: response.ok,
      unstable: latency > UNSTABLE_LATENCY_MS,
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

function getConnectionHint() {
  if (typeof navigator === "undefined") return false;
  const connection = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; rtt?: number; downlink?: number };
    }
  ).connection;
  if (!connection) return false;
  return (
    connection.effectiveType === "slow-2g" ||
    connection.effectiveType === "2g" ||
    (typeof connection.rtt === "number" && connection.rtt > 1200) ||
    (typeof connection.downlink === "number" && connection.downlink > 0 && connection.downlink < 0.7)
  );
}

export function AppStatusNotifier() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const pushMessageNotification = useNotificationStore((state) => state.pushMessageNotification);
  const [connectionState, setConnectionState] = useState<ConnectionState>("online");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isStatusModuleEnabled, setIsStatusModuleEnabled] = useState(true);
  const previousUnreadRef = useRef(0);
  const hasLoadedMessagesRef = useRef(false);
  const previousConnectionRef = useRef<ConnectionState>("online");

  const toastIcon = useMemo(() => {
    if (!toast) return FiWifi;
    if (toast.type === "offline") return FiWifiOff;
    if (toast.type === "message") return FiMessageCircle;
    return FiWifi;
  }, [toast]);

  useEffect(() => {
    let active = true;
    const loadModuleState = async () => {
      try {
        const modules = await fetchPublicModules();
        if (!active) return;
        const statusModule = modules.find((module) => module.key === "app_status_alerts");
        setIsStatusModuleEnabled(statusModule?.is_enabled ?? true);
      } catch {
        if (active) setIsStatusModuleEnabled(true);
      }
    };

    void loadModuleState();
    const interval = window.setInterval(loadModuleState, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (!isStatusModuleEnabled) return;
    if (toast.type === "offline") return;
    const timeout = window.setTimeout(() => setToast(null), 5200);
    return () => window.clearTimeout(timeout);
  }, [isStatusModuleEnabled, toast]);

  useEffect(() => {
    if (!isStatusModuleEnabled) {
      setToast(null);
      return;
    }
    if (typeof window === "undefined") return;

    const updateState = (nextState: ConnectionState, detail?: string) => {
      setConnectionState(nextState);
      if (previousConnectionRef.current === nextState) return;
      previousConnectionRef.current = nextState;

      if (nextState === "offline") {
        setToast({
          id: `network-offline-${Date.now()}`,
          type: "offline",
          title: "Connexion perdue",
          message: "Yeloo reste ouvert, mais les nouvelles donnees attendront le retour du reseau.",
        });
        void showDeviceNotification({
          title: "Connexion perdue",
          body: "Certaines actions seront indisponibles jusqu'au retour du reseau.",
          tag: "yeloo-network-offline",
          url: "/",
        });
        return;
      }

      if (nextState === "unstable") {
        setToast({
          id: `network-unstable-${Date.now()}`,
          type: "unstable",
          title: "Connexion instable",
          message: detail || "Le reseau repond lentement. Les images et messages peuvent prendre plus de temps.",
        });
        return;
      }

      setToast({
        id: `network-online-${Date.now()}`,
        type: "online",
        title: "Connexion retablie",
        message: "Tout est revenu, on reprend normalement.",
      });
    };

    const runCheck = async () => {
      if (!navigator.onLine) {
        updateState("offline");
        return;
      }

      if (getConnectionHint()) {
        updateState("unstable", "Le signal reseau semble faible.");
        return;
      }

      try {
        const health = await checkApiHealth();
        if (!health.ok || health.unstable) {
          updateState("unstable");
          return;
        }
        updateState("online");
      } catch {
        updateState("unstable");
      }
    };

    const handleOffline = () => updateState("offline");
    const handleOnline = () => void runCheck();

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    void runCheck();
    const interval = window.setInterval(runCheck, 18000);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.clearInterval(interval);
    };
  }, [isStatusModuleEnabled]);

  useEffect(() => {
    if (!isStatusModuleEnabled) return;
    if (!isAuthenticated || !token || !user?.id) {
      previousUnreadRef.current = 0;
      hasLoadedMessagesRef.current = false;
      return;
    }

    let active = true;

    const notifyFromConversations = (conversations: ConversationSummary[]) => {
      const unreadConversations = conversations.filter((item) => item.unread_count > 0);
      const nextUnread = unreadConversations.reduce((total, item) => total + item.unread_count, 0);
      const latest = unreadConversations[0];

      for (const conversation of unreadConversations) {
        pushMessageNotification({
          userId: user.id,
          conversationId: conversation.id,
          title: conversation.counterpart_name || "Nouveau message Yeloo",
          preview:
            conversation.last_message_preview ||
            conversation.property_title ||
            "Vous avez recu un nouveau message.",
          updatedAt: conversation.updated_at,
        });
      }

      if (hasLoadedMessagesRef.current && latest && nextUnread > previousUnreadRef.current) {
        const body =
          latest.last_message_preview ||
          latest.property_title ||
          "Vous avez recu un nouveau message.";
        setToast({
          id: `message-${latest.id}-${latest.updated_at}`,
          type: "message",
          title: latest.counterpart_name || "Nouveau message",
          message: body,
        });
        void showDeviceNotification({
          title: latest.counterpart_name || "Nouveau message Yeloo",
          body,
          tag: `yeloo-message-${latest.id}`,
          url: `/messages/${latest.id}`,
        });
      }

      previousUnreadRef.current = nextUnread;
      hasLoadedMessagesRef.current = true;
    };

    const loadMessages = async () => {
      try {
        const conversations = await fetchConversations(token);
        if (!active) return;
        notifyFromConversations(conversations);
      } catch {
        // Network toast handles connection problems; no need to duplicate here.
      }
    };

    void loadMessages();
    const interval = window.setInterval(loadMessages, 20000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadMessages();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, isStatusModuleEnabled, pushMessageNotification, token, user?.id]);

  const Icon = toastIcon;

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.96 }}
          transition={{ duration: 0.22 }}
          className="fixed left-3 right-3 top-20 z-[1200] mx-auto max-w-sm rounded-[1.5rem] border border-blue-100 bg-[#f0f2ff] px-4 py-4 shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur sm:top-24"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl text-blue-700 shadow-sm">
              <Icon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-neutral-950">{toast.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-600">{toast.message}</p>
            </div>
            {toast.type !== "offline" && (
              <button
                type="button"
                onClick={() => setToast(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-white"
                aria-label="Fermer l'alerte"
              >
                x
              </button>
            )}
          </div>
          {connectionState === "offline" && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70">
              <motion.div
                className="h-full rounded-full bg-blue-700"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
