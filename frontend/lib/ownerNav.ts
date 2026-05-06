"use client";

import { FiCalendar, FiFileText, FiGrid, FiHome, FiMessageCircle, FiUser } from "react-icons/fi";

export type OwnerNavItem = {
  href: string;
  label: string;
  Icon: typeof FiHome;
  isActive: (pathname: string) => boolean;
};

export const ownerNavItems: OwnerNavItem[] = [
  {
    href: "/",
    label: "Home",
    Icon: FiGrid,
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/proprietaire",
    label: "Aperçu",
    Icon: FiHome,
    isActive: (pathname) => pathname === "/proprietaire",
  },
  {
    href: "/proprietaire/biens",
    label: "Mes biens",
    Icon: FiFileText,
    isActive: (pathname) => pathname.startsWith("/proprietaire/biens"),
  },
  {
    href: "/proprietaire/calendrier",
    label: "Calendrier",
    Icon: FiCalendar,
    isActive: (pathname) => pathname.startsWith("/proprietaire/calendrier"),
  },
  {
    href: "/messages?mode=owner",
    label: "Messages",
    Icon: FiMessageCircle,
    isActive: (pathname) => pathname.startsWith("/messages"),
  },
  {
    href: "/proprietaire/profil",
    label: "Profil",
    Icon: FiUser,
    isActive: (pathname) => pathname.startsWith("/proprietaire/profil"),
  },
];
