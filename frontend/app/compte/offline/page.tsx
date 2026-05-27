"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiArrowLeft, FiDatabase, FiFileText, FiMap, FiRefreshCw, FiWifi, FiWifiOff } from "react-icons/fi";
import { AccountSidebar } from "@/components/AccountSidebar";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";

type CacheInfo = {
  name: string;
  count: number;
};

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 Mo";
  return `${(value / 1024 / 1024).toFixed(1)} Mo`;
}

export default function OfflineStatusPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [cachesInfo, setCachesInfo] = useState<CacheInfo[]>([]);
  const [storageUsage, setStorageUsage] = useState(0);
  const [pendingActions, setPendingActions] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshStatus = async () => {
    setIsRefreshing(true);

    try {
      setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);

      if ("caches" in window) {
        const names = await caches.keys();
        const nextInfo = await Promise.all(
          names.map(async (name) => {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            return { name, count: keys.length };
          })
        );
        setCachesInfo(nextInfo);
      }

      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        setStorageUsage(estimate.usage || 0);
      }

      const queuedKeys = Object.keys(localStorage).filter((key) =>
        key.toLowerCase().includes("offline")
      );
      setPendingActions(queuedKeys.length);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
    const handleOnlineStatus = () => void refreshStatus();
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);
    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  const mapTileCount = useMemo(
    () =>
      cachesInfo
        .filter((item) => item.name.includes("osm") || item.name.includes("map"))
        .reduce((sum, item) => sum + item.count, 0),
    [cachesInfo]
  );

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <AccountSidebar />
      <main className="mx-auto max-w-md px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <Link
              href="/compte"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700"
              aria-label="Retour"
            >
              <FiArrowLeft />
            </Link>
            <button
              type="button"
              onClick={() => void refreshStatus()}
              disabled={isRefreshing}
              className="flex h-10 items-center gap-2 rounded-full bg-blue-600 px-4 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-80"
            >
              <motion.span
                animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  isRefreshing
                    ? { repeat: Infinity, duration: 0.75, ease: "linear" }
                    : { duration: 0.2 }
                }
                className="inline-flex"
              >
                <FiRefreshCw />
              </motion.span>
              Actualiser
            </button>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Statut offline</h1>
            <p className="mt-1 text-sm text-neutral-600">Synchronisation, brouillons et carte hors connexion.</p>
          </div>

          <div
            className={`rounded-3xl border px-5 py-4 ${
              isOnline ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-full ${
                  isOnline ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {isOnline ? <FiWifi /> : <FiWifiOff />}
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-950">
                  {isOnline ? "Connexion active" : "Mode hors connexion"}
                </p>
                <p className="mt-1 text-xs leading-5 text-neutral-600">
                  {isOnline
                    ? "Les brouillons seront synchronisés automatiquement dès qu'une action est prête."
                    : "Vous pouvez consulter les pages et tuiles de carte déjà mises en cache."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              { label: "Tuiles carte offline", value: mapTileCount, icon: FiMap },
              { label: "Caches PWA", value: cachesInfo.length, icon: FiDatabase },
              { label: "Actions en attente", value: pendingActions, icon: FiRefreshCw },
              { label: "Stockage utilisé", value: formatBytes(storageUsage), icon: FiFileText },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-3xl bg-neutral-50 px-5 py-4 ring-1 ring-black/5"
              >
                <div>
                  <p className="text-xs text-neutral-500">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-neutral-950">{item.value}</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <item.icon />
                </span>
              </div>
            ))}
          </div>

          <section className="rounded-3xl bg-neutral-50 p-5 ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-neutral-950">Carte offline</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Les zones de carte que vous ouvrez en ligne sont gardées quelques jours dans le cache.
              Pour une vraie zone téléchargeable manuelle, il faudra ensuite ajouter un module de
              sélection de zone et une limite de stockage par ville/quartier.
            </p>
          </section>
        </motion.section>
      </main>
      <BottomNav />
    </div>
  );
}
