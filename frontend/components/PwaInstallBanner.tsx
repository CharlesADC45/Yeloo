"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiDownload, FiShare, FiX } from "react-icons/fi";
import { YelooWordmark } from "@/components/YelooWordmark";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "yeloo-install-banner-dismissed";

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function PwaInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneDisplay()) return;
    if (window.sessionStorage.getItem(DISMISS_KEY)) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isiPhoneOrPad = /iphone|ipad|ipod/.test(ua);
    setIsIos(isiPhoneOrPad);

    const timer = window.setTimeout(() => {
      if (isiPhoneOrPad) setIsVisible(true);
    }, 1600);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      window.setTimeout(() => setIsVisible(true), 800);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const installLabel = useMemo(() => {
    if (installPrompt) return "Installer";
    if (isIos) return "Installer sur iPhone";
    return "Installer";
  }, [installPrompt, isIos]);

  const dismiss = () => {
    window.sessionStorage.setItem(DISMISS_KEY, "true");
    setIsVisible(false);
  };

  const handleInstall = async () => {
    if (!installPrompt) {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({
          title: "Yeloo+",
          text: "Installez Yeloo+ sur votre ecran d'accueil.",
          url: window.location.origin,
        }).catch(() => null);
      }
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
    dismiss();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-x-3 bottom-4 z-[1200] mx-auto max-w-md overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#111827] text-white shadow-[0_22px_70px_rgba(15,23,42,0.28)] sm:bottom-6"
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.24 }}
        >
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <YelooWordmark markClassName="!text-[1.3rem] !text-white" />
              <p className="mt-1 text-xs text-white/65">yeloo.app</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleInstall}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-[#111827]"
              >
                <FiDownload className="h-4 w-4" />
                {installLabel}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
                aria-label="Fermer l'installation"
              >
                <FiX />
              </button>
            </div>
          </div>
          <div className="bg-white px-4 py-4 text-[#111827]">
            <p className="text-sm font-bold">Ajoutez Yeloo+ à votre écran d’accueil.</p>
            <p className="mt-1 text-xs leading-5 text-neutral-600">
              {installPrompt
                ? "Ouvrez l’app plus vite, avec une expérience plein écran."
                : "Sur iOS, appuyez sur Partager puis choisissez Ajouter à l’écran d’accueil."}
            </p>
            {!installPrompt && isIos && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                <FiShare className="h-4 w-4" />
                Partager → Ajouter à l’écran d’accueil
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
