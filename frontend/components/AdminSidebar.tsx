"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiLogOut, FiShield } from "react-icons/fi";
import { adminNavItems } from "@/lib/adminNav";
import { useAuthStore } from "@/stores/authStore";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-neutral-200 lg:bg-white/92 lg:pt-24">
      <div className="flex items-center gap-3 px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-soft">
          <FiShield />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">Super admin</p>
          <p className="text-xs text-neutral-500">Pilotage global Yeloo</p>
        </div>
      </div>
      <nav className="mt-6 flex flex-1 flex-col gap-2 px-4 text-sm">
        {adminNavItems.map(({ href, label, Icon, isActive }) => {
          const active = pathname ? isActive(pathname) : false;
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                active
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-50"
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
          className="mt-3 flex items-center gap-3 rounded-2xl px-4 py-3 text-neutral-600 hover:bg-neutral-50"
        >
          <FiLogOut />
          Logout
        </button>
      </nav>
      <div className="px-6 pb-6 text-xs text-neutral-400">Yeloo • Super admin</div>
    </aside>
  );
}
