"use client";

import { FiGlobe, FiMoon, FiSun } from "react-icons/fi";
import { useT } from "@/lib/i18n";
import { usePreferencesStore } from "@/stores/preferencesStore";

type PreferenceControlsProps = {
  compact?: boolean;
};

export function PreferenceControls({ compact = false }: PreferenceControlsProps) {
  const t = useT();
  const theme = usePreferencesStore((state) => state.theme);
  const language = usePreferencesStore((state) => state.language);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const isDark = theme === "dark";
  const isEnglish = language === "en";

  const switchClass = (active: boolean) =>
    `relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border p-1 transition ${
      active ? "border-blue-600 bg-blue-600" : "border-neutral-200 bg-white"
    }`;

  const knobClass = (active: boolean) =>
    `inline-flex h-7 w-7 transform items-center justify-center rounded-full transition ${
      active ? "translate-x-7 bg-white text-blue-600" : "translate-x-0 bg-neutral-100 text-neutral-500"
    }`;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3 ring-1 ring-black/5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            {isDark ? <FiMoon /> : <FiSun />}
          </span>
          <span className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900">{t("appearance")}</p>
            <p className="text-xs text-neutral-500">{isDark ? t("dark") : t("light")}</p>
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className={switchClass(isDark)}
        >
          <span className={knobClass(isDark)}>
            <span className="h-2 w-2 rounded-full bg-current" />
          </span>
        </button>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3 ring-1 ring-black/5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <FiGlobe />
          </span>
          <span className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900">{t("language")}</p>
            <p className="text-xs text-neutral-500">{isEnglish ? "EN" : "FR"}</p>
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isEnglish}
          onClick={() => setLanguage(isEnglish ? "fr" : "en")}
          className={switchClass(isEnglish)}
        >
          <span className={knobClass(isEnglish)}>
            <span className="text-[10px] font-bold leading-none">{isEnglish ? "EN" : "FR"}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
