"use client";

import { useEffect } from "react";

export function AppServiceWorkerUpdater() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let hasReloaded = false;
    const hadController = Boolean(navigator.serviceWorker.controller);

    const reloadOnce = () => {
      if (!hadController || hasReloaded) return;
      hasReloaded = true;
      window.location.reload();
    };

    const activateWaitingWorker = (registration: ServiceWorkerRegistration) => {
      if (!registration.waiting) return;
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    };

    const checkForUpdate = async () => {
      const registration = await navigator.serviceWorker.getRegistration().catch(() => null);
      if (!registration) return;

      activateWaitingWorker(registration);
      await registration.update().catch(() => undefined);

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            activateWaitingWorker(registration);
          }
        });
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdate();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", reloadOnce);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkForUpdate);
    void checkForUpdate();

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", reloadOnce);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkForUpdate);
    };
  }, []);

  return null;
}
