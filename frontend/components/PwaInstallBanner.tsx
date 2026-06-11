"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiDownload, FiShare, FiX } from "react-icons/fi";
import { YelooWordmark } from "@/components/YelooWordmark";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "yeloo-install-sheet-dismissed";

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
  const [isExpanded, setIsExpanded] = useState(false);
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

  const helperText = useMemo(() => {
    if (installPrompt) {
      return "Ouvrez l'app plus vite, avec une experience plein ecran.";
    }
    if (isIos) {
      return "Sur iOS, appuyez sur Partager puis choisissez Ajouter a l'ecran d'accueil.";
    }
    return "Ajoutez Yeloo+ a votre ecran d'accueil pour ouvrir l'app plus vite.";
  }, [installPrompt, isIos]);

  const dismiss = () => {
    window.sessionStorage.setItem(DISMISS_KEY, "true");
    setIsVisible(false);
  };

  const handleInstall = async () => {
    if (!installPrompt) {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator
          .share({
            title: "Yeloo+",
            text: "Installez Yeloo+ sur votre ecran d'accueil.",
            url: window.location.origin,
          })
          .catch(() => null);
      }
      setIsExpanded(true);
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
          className="fixed inset-x-0 bottom-0 z-[1200] mx-auto max-w-md overflow-hidden rounded-t-[2rem] bg-white text-[#111827] shadow-[0_-24px_70px_rgba(15,23,42,0.24)] ring-1 ring-black/5"
          initial={{ y: "100%" }}
          animate={{ y: 0, height: isExpanded ? "min(70vh, 27rem)" : "10.6rem" }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.08, bottom: 0.25 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 70) {
              setIsExpanded(false);
              return;
            }
            if (info.offset.y < -45) {
              setIsExpanded(true);
            }
          }}
        >
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            className="flex w-full justify-center bg-[#111827] pt-3"
            aria-label={isExpanded ? "Reduire l'installation" : "Afficher l'installation"}
          >
            <span className="h-1 w-12 rounded-full bg-white/35" />
          </button>

          <div className="flex items-center justify-between gap-3 bg-[#111827] px-5 pb-4 pt-3 text-white">
            <div className="min-w-0">
              <YelooWordmark
                casing="upper"
                markClassName="!text-[1.58rem] !font-extrabold !tracking-[-0.075em] !text-white"
              />
              <p className="mt-1 text-xs font-medium text-white/62">yeloo.app</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleInstall}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-[#111827]"
              >
                <FiDownload className="h-4 w-4" />
                Installer
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white"
                aria-label="Fermer l'installation"
              >
                <FiX />
              </button>
            </div>
          </div>

          <div className="px-5 py-4">
            <p className="text-sm font-black">Ajoutez Yeloo+ a votre ecran d'accueil.</p>
            <p className="mt-1 max-w-[20rem] text-sm leading-5 text-neutral-600">{helperText}</p>
            {isExpanded && (
              <div className="mt-5 rounded-[1.5rem] bg-neutral-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-500">
                  Installation rapide
                </p>
                <div className="mt-4 space-y-3 text-sm text-neutral-700">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                      <FiDownload />
                    </span>
                    <span>Android/Chrome: appuyez sur Installer.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                      <FiShare />
                    </span>
                    <span>iPhone/Safari: Partager, puis Ajouter a l'ecran d'accueil.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
