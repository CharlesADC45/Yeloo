"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiLogOut } from "react-icons/fi";
import { ownerNavItems } from "@/lib/ownerNav";
import { useAuthStore } from "@/stores/authStore";

export function OwnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-72 lg:flex-col lg:bg-white lg:pt-24">
      <div className="px-6">
        <p className="text-sm font-semibold text-neutral-900">Mon espace</p>
        <p className="text-xs text-neutral-500">Tableau de bord</p>
      </div>
      <nav className="mt-7 flex flex-1 flex-col gap-1 px-4 text-sm">
        {ownerNavItems.map(({ href, label, Icon, isActive }) => {
          const active = pathname ? isActive(pathname) : false;
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 rounded-full px-4 py-3 transition ${
                active ? "bg-blue-700 text-white" : "text-neutral-600 hover:text-blue-700"
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 pb-6">
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-sm text-neutral-600 transition hover:text-blue-700"
        >
          <FiLogOut />
          Logout
        </button>
        <div className="mt-8 px-2 text-xs text-neutral-400">Yeloo · Propriétaire</div>
      </div>
    </aside>
  );
}

