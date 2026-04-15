"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiGrid, FiLogOut } from "react-icons/fi";
import { ownerNavItems } from "@/lib/ownerNav";
import { useAuthStore } from "@/stores/authStore";

export function OwnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-neutral-200 lg:bg-white/90 lg:pt-24">
      <div className="flex items-center gap-3 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <FiGrid />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">Mon espace</p>
          <p className="text-xs text-neutral-500">Tableau de bord</p>
        </div>
      </div>
      <nav className="mt-6 flex flex-1 flex-col gap-2 px-4 text-sm">
        {ownerNavItems.map(({ href, label, Icon, isActive }) => {
          const active = pathname ? isActive(pathname) : false;
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-neutral-600"
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="mt-3 flex items-center gap-3 rounded-2xl px-4 py-3 text-neutral-600"
        >
          <FiLogOut />
          Logout
        </button>
      </nav>
      <div className="px-6 pb-6 text-xs text-neutral-400">Yeloo • 2026</div>
    </aside>
  );
}

