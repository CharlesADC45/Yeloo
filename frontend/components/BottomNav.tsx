"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FiSearch, FiHeart, FiMapPin, FiMessageCircle, FiUser } from "react-icons/fi";
import { useAuthStore } from "@/stores/authStore";

export function BottomNav() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

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
      className="fixed bottom-5 left-0 right-0 z-40 mx-auto w-[calc(100%-2rem)] max-w-2xl rounded-3xl border border-neutral-200 bg-white/80 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md"
    >
      <div className="flex justify-between gap-2 sm:gap-4">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href === "/messages" && pathname?.startsWith("/messages")) ||
            (tab.href.startsWith("/connexion?next=/messages") && pathname?.startsWith("/messages"));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center text-sm"
            >
              <motion.span
                whileTap={{ scale: 0.9 }}
                className={`text-xl ${
                  isActive ? "text-neutral-900" : "text-neutral-500"
                }`}
              >
                {tab.icon}
              </motion.span>
              <span
                className={`truncate text-[13px] sm:text-sm ${
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

