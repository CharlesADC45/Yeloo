import {
  FiActivity,
  FiCheckCircle,
  FiHome,
  FiLayers,
  FiMap,
  FiMessageCircle,
  FiShield,
  FiUser,
  FiUsers,
} from "react-icons/fi";

export type AdminNavItem = {
  href: string;
  label: string;
  Icon: typeof FiShield;
  isActive: (pathname: string) => boolean;
};

export const adminNavItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Vue globale",
    Icon: FiShield,
    isActive: (pathname) => pathname === "/admin",
  },
  {
    href: "/admin/modules",
    label: "Modules",
    Icon: FiLayers,
    isActive: (pathname) => pathname.startsWith("/admin/modules"),
  },
  {
    href: "/admin/users",
    label: "Utilisateurs",
    Icon: FiUsers,
    isActive: (pathname) => pathname.startsWith("/admin/users"),
  },
  {
    href: "/admin/verifications",
    label: "Vérifications",
    Icon: FiCheckCircle,
    isActive: (pathname) => pathname.startsWith("/admin/verifications"),
  },
  {
    href: "/admin/publications",
    label: "Publications",
    Icon: FiMap,
    isActive: (pathname) => pathname.startsWith("/admin/publications"),
  },
  {
    href: "/messages",
    label: "Conversations",
    Icon: FiMessageCircle,
    isActive: (pathname) => pathname.startsWith("/messages"),
  },
  {
    href: "/admin/baux",
    label: "Baux",
    Icon: FiActivity,
    isActive: (pathname) => pathname.startsWith("/admin/baux"),
  },
  {
    href: "/admin/profil",
    label: "Profil",
    Icon: FiUser,
    isActive: (pathname) => pathname.startsWith("/admin/profil"),
  },
  {
    href: "/",
    label: "Retour site",
    Icon: FiHome,
    isActive: () => false,
  },
];
