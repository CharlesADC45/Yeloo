"use client";

import {
  FiHelpCircle,
  FiSettings,
  FiUser,
  FiWifiOff,
} from "react-icons/fi";

export type AccountNavItem = {
  href: string;
  label: string;
  Icon: typeof FiUser;
  isActive: (pathname: string) => boolean;
};

export const accountNavItems: AccountNavItem[] = [
  {
    href: "/compte",
    label: "À propos",
    Icon: FiUser,
    isActive: (pathname) => pathname === "/compte",
  },
  {
    href: "/compte/offline",
    label: "Statut de synchro offline",
    Icon: FiWifiOff,
    isActive: (pathname) => pathname.startsWith("/compte/offline"),
  },
  {
    href: "/compte/informations-personnelles",
    label: "Informations personnelles",
    Icon: FiUser,
    isActive: (pathname) => pathname.startsWith("/compte/informations-personnelles"),
  },
  {
    href: "/compte/parametres",
    label: "Paramètres",
    Icon: FiSettings,
    isActive: (pathname) => pathname.startsWith("/compte/parametres"),
  },
  {
    href: "/compte/aide-support",
    label: "Aide & Support",
    Icon: FiHelpCircle,
    isActive: (pathname) => pathname.startsWith("/compte/aide-support"),
  },
];
