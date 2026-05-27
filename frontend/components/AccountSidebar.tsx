"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountNavItems } from "@/lib/accountNav";

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:fixed lg:left-8 lg:top-28 lg:z-30 lg:block lg:w-64">
      <div className="space-y-5">
        <div className="border-b border-neutral-200 pb-6">
          <h1 className="text-[2.25rem] font-semibold tracking-tight text-neutral-950">
            Profil
          </h1>
        </div>

        <nav className="space-y-2">
          {accountNavItems.map((item) => {
            const active = pathname ? item.isActive(pathname) : false;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 shadow-soft">
                  <item.Icon />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
