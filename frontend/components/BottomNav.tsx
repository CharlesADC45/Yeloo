"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FiSearch, FiHeart, FiMapPin, FiMessageCircle, FiUser } from "react-icons/fi";
import { showDeviceNotification } from "@/lib/deviceNotifications";
import { fetchConversations } from "@/lib/messages";
import { useAuthStore } from "@/stores/authStore";

export function BottomNav() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const previousUnreadMessagesRef = useRef(0);
  const hasLoadedUnreadRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setUnreadMessages(0);
      previousUnreadMessagesRef.current = 0;
      hasLoadedUnreadRef.current = false;
      return;
    }

    let active = true;

    const loadUnread = async () => {
      try {
        const conversations = await fetchConversations(token);
        if (!active) return;
        const nextUnread = conversations.reduce((total, item) => total + item.unread_count, 0);
        const latestUnreadConversation = conversations.find((item) => item.unread_count > 0);

        if (hasLoadedUnreadRef.current && nextUnread > previousUnreadMessagesRef.current) {
          void showDeviceNotification({
            title: latestUnreadConversation?.counterpart_name || "Nouveau message Yeloo",
            body:
              latestUnreadConversation?.last_message_preview ||
              latestUnreadConversation?.property_title ||
              "Vous avez reçu un nouveau message.",
            tag: latestUnreadConversation?.id || "yeloo-message",
            url: latestUnreadConversation ? `/messages/${latestUnreadConversation.id}` : "/messages",
          });
        }

        previousUnreadMessagesRef.current = nextUnread;
        hasLoadedUnreadRef.current = true;
        setUnreadMessages(nextUnread);
      } catch {
        if (active) setUnreadMessages(0);
      }
    };

    void loadUnread();
    const interval = window.setInterval(loadUnread, 20000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadUnread();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, token]);

  const tabs = [
    {
      href: "/",
      label: "Explorer",
      icon: <FiSearch />,
    },
    { href: "/favoris", label: "Favoris", icon: <FiHeart /> },
    { href: "/carte", label: "Carte", icon: <FiMapPin /> },
    {
      href: isAuthenticated ? "/messages" : "/connexion?next=/messages",
      label: "Messages",
      icon: <FiMessageCircle />,
      badge: unreadMessages,
    },
    {
      href: isAuthenticated ? "/compte" : "/connexion",
      label: isAuthenticated ? "Compte" : "Connexion",
      icon: <FiUser />,
    },
  ];

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="fixed bottom-5 left-0 right-0 z-40 mx-auto w-[calc(100%-1rem)] max-w-2xl rounded-3xl border border-neutral-200 bg-white/80 px-3 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md sm:w-[calc(100%-2rem)] sm:px-4"
    >
      <div className="grid grid-cols-5 gap-1 sm:gap-4">
        {tabs.map((tab, index) => {
          const isActive =
            pathname === tab.href ||
            (tab.href === "/messages" && pathname?.startsWith("/messages")) ||
            (tab.href.startsWith("/connexion?next=/messages") && pathname?.startsWith("/messages"));
          const badgeCount = "badge" in tab ? tab.badge ?? 0 : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-0 flex-col items-center gap-1 text-center text-sm ${
                index >= 3 ? "px-1" : ""
              }`}
            >
              <motion.span
                whileTap={{ scale: 0.9 }}
                className={`relative text-xl ${
                  isActive ? "text-neutral-900" : "text-neutral-500"
                }`}
              >
                {tab.icon}
                {badgeCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </motion.span>
              <span
                className={`max-w-full truncate text-[12px] leading-none sm:text-sm ${
                  isActive ? "font-semibold text-neutral-900" : "text-neutral-500"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}

