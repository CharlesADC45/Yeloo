"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiChevronRight, FiGlobe, FiLogOut, FiX } from "react-icons/fi";
import { YelooWordmark } from "@/components/YelooWordmark";
import { useT } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferencesStore";

export type SiteMenuLink = { href: string; label: string; isActive?: (pathname: string) => boolean };
export type SiteMenuEntry =
  | ({ kind: "link" } & SiteMenuLink)
  | { kind: "group"; label: string; links: SiteMenuLink[] };

type SiteMenuProps = {
  open: boolean;
  onClose: () => void;
  entries: SiteMenuEntry[];
  cta: { href: string; label: string };
  onLogout?: () => void;
};

const rowClass =
  "flex w-full items-center justify-between gap-3 border-b border-line px-5 py-5 text-[17px] text-ink transition hover:text-primary";

function isLinkActive(link: SiteMenuLink, pathname: string | null) {
  if (!pathname) return false;
  return link.isActive ? link.isActive(pathname) : pathname === link.href;
}

/** Labeled "Menu ☰" trigger shared by every header. */
export function SiteMenuButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button type="button" onClick={onClick} className="yeloo-menu-trigger" aria-label={t("menu")}>
      <span>{t("menu")}</span>
      <span aria-hidden="true" className="yeloo-menu-trigger__bars">
        <span />
        <span />
        <span />
      </span>
    </button>
  );
}

export function SiteMenu({ open, onClose, entries, cta, onLogout }: SiteMenuProps) {
  const t = useT();
  const pathname = usePathname();
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const language = usePreferencesStore((state) => state.language);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const isDark = theme === "dark";

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose, open]);

  const renderLink = (link: SiteMenuLink, nested = false) => {
    const active = isLinkActive(link, pathname);
    return (
      <Link
        key={`${link.href}-${link.label}`}
        href={link.href}
        replace
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        className={
          nested
            ? `flex items-center justify-between gap-3 py-3 pl-11 pr-5 text-[15px] transition hover:text-primary ${
                active ? "font-semibold text-primary" : "text-muted"
              }`
            : `${rowClass} ${active ? "font-semibold text-primary" : ""}`
        }
      >
        {link.label}
        {active && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
      </Link>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1001]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={t("menu")}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute inset-0 hidden bg-ink/40 backdrop-blur-sm sm:block"
            aria-label={t("closeMenu")}
          />
          <motion.aside
            className="yeloo-site-menu absolute inset-y-0 right-0 flex w-full flex-col bg-white sm:max-w-[26rem] sm:shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-6">
              <YelooWordmark href="/" replace className="shrink-0" />
              <button type="button" onClick={onClose} className="yeloo-menu-trigger" aria-label={t("closeMenu")}>
                <span>{t("closeLabel")}</span>
                <FiX className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-2 sm:px-4">
              {entries.map((entry) =>
                entry.kind === "link" ? (
                  renderLink(entry)
                ) : (
                  <details
                    key={entry.label}
                    className="yeloo-menu-group border-b border-line"
                    open={entry.links.some((link) => isLinkActive(link, pathname))}
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-5 text-[17px] font-semibold text-ink">
                      <span className="yeloo-menu-group__caret" aria-hidden="true">
                        ▸
                      </span>
                      {entry.label}
                    </summary>
                    <div className="pb-3">{entry.links.map((link) => renderLink(link, true))}</div>
                  </details>
                )
              )}

              <div className={rowClass}>
                <span>{t("darkMode")}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDark}
                  aria-label={t("darkMode")}
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
                    isDark ? "bg-primary" : "bg-line"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow transition ${isDark ? "translate-x-5" : ""}`}
                  />
                </button>
              </div>

              {onLogout && (
                <button type="button" onClick={onLogout} className={`${rowClass} text-left`}>
                  {t("logout")}
                  <FiLogOut className="shrink-0 text-muted" aria-hidden="true" />
                </button>
              )}
            </nav>

            <div className="flex items-center gap-3 border-t border-line px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              <div className="yeloo-lang-switch" role="group" aria-label={t("language")}>
                <FiGlobe className="mx-1.5 h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
                {(["fr", "en"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    aria-pressed={language === code}
                    className={language === code ? "is-active" : undefined}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
              <Link href={cta.href} replace onClick={onClose} className="yeloo-menu-cta">
                {cta.label}
                <FiChevronRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
