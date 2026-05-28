"use client";

import { useEffect } from "react";
import { usePreferencesStore } from "@/stores/preferencesStore";

export function AppPreferences() {
  const theme = usePreferencesStore((state) => state.theme);
  const language = usePreferencesStore((state) => state.language);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    root.lang = language;

    const themeColor = theme === "dark" ? "#09090b" : "#ffffff";
    let meta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = themeColor;
  }, [theme, language]);

  return null;
}
