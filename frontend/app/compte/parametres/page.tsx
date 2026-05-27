"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FiArrowLeft,
  FiBell,
  FiChevronRight,
  FiKey,
  FiMap,
  FiMoon,
  FiSmartphone,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { AccountSidebar } from "@/components/AccountSidebar";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import {
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
} from "@/lib/deviceNotifications";
import { useAuthStore } from "@/stores/authStore";
import {
  getNotificationPrefs,
  useNotificationStore,
} from "@/stores/notificationStore";

export default function ParametresPage() {
  const bottomNav = <BottomNav />;
  const user = useAuthStore((state) => state.user);
  const prefsByUser = useNotificationStore((state) => state.prefsByUser);
  const setOwnerPostNotifications = useNotificationStore(
    (state) => state.setOwnerPostNotifications
  );
  const notificationsEnabled = getNotificationPrefs(prefsByUser, user?.id)
    .ownerPostNotifications;
  const devicePermission = getDeviceNotificationPermission();
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const deviceNotificationHint = useMemo(() => {
    if (devicePermission === "unsupported") {
      return "Notifications navigateur non supportées sur cet appareil.";
    }
    if (devicePermission === "denied") {
      return "Notifications bloquées par le navigateur. Autorisez-les dans les réglages du navigateur.";
    }
    if (devicePermission === "default") {
      return "Autorisez les notifications navigateur pour recevoir les alertes pendant que l'app est ouverte.";
    }
    return "Notifications navigateur autorisées.";
  }, [devicePermission]);

  const toggleNotifications = async () => {
    if (!user?.id) return;

    const nextEnabled = !notificationsEnabled;
    if (nextEnabled) {
      const permission = await requestDeviceNotificationPermission();
      if (permission !== "granted") {
        setOwnerPostNotifications(user.id, false);
        setNotificationMessage(
          permission === "denied"
            ? "Les notifications appareil sont bloquées. Autorisez-les dans le navigateur du téléphone."
            : "Les notifications appareil ne sont pas encore autorisées."
        );
        return;
      }
    }
    setOwnerPostNotifications(user.id, nextEnabled);
    setNotificationMessage(
      nextEnabled
        ? "Notifications appareil activées pour ce compte."
        : "Notifications appareil désactivées pour ce compte."
    );
  };

  return (
    <div className="min-h-screen bg-transparent">
      <TopBar />
      <AccountSidebar />
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-24 lg:ml-72 lg:max-w-[calc(100%-18rem)] lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          <div className="flex items-center justify-between">
            <Link
              href="/compte"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-soft"
            >
              <FiArrowLeft />
            </Link>
            <div className="rounded-full border border-neutral-200 bg-white px-4 py-1 text-xs font-semibold text-neutral-600 shadow-soft">
              1 / 1
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Paramètres</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Configuration de l&apos;application
            </p>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
            <div className="h-full w-full rounded-full bg-blue-500" />
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
            <h3 className="text-sm font-semibold text-neutral-900">Sécurité</h3>
            <Link
              href="/compte/changer-mot-de-passe"
              className="mt-4 flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3 ring-1 ring-black/5"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <FiKey />
                </span>
                <span>
                  <p className="text-sm font-semibold text-neutral-900">
                    Changer le mot de passe
                  </p>
                </span>
              </span>
              <FiChevronRight className="text-neutral-400" />
            </Link>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
            <h3 className="text-sm font-semibold text-neutral-900">Préférences</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3 ring-1 ring-black/5">
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <FiBell />
                  </span>
                  <span>
                    <p className="text-sm font-semibold text-neutral-900">Notifications</p>
                    {/* <p className="text-xs text-neutral-500">
                      Recevoir les nouvelles annonces publiées par les propriétaires
                    </p> */}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationsEnabled}
                  onClick={() => void toggleNotifications()}
                  className={`relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border p-1 transition ${
                    notificationsEnabled
                      ? "border-blue-600 bg-blue-600"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  <span
                    className={`inline-flex h-7 w-7 transform items-center justify-center rounded-full transition ${
                      notificationsEnabled
                        ? "translate-x-7 bg-white text-blue-600"
                        : "translate-x-0 bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-current" />
                  </span>
                </button>
              </div>
              {/* <p className="px-1 text-[11px] leading-5 text-neutral-500">
                Notifications appareil :{" "}
                <span className="font-semibold text-neutral-700">
                  {devicePermission === "unsupported"
                    ? "non supportées"
                    : devicePermission === "granted"
                      ? "autorisées"
                      : devicePermission === "denied"
                        ? "bloquées par le navigateur"
                        : "à autoriser"}
                </span>
              </p> */}
              {/* <p className="px-1 text-[11px] leading-5 text-neutral-500">{deviceNotificationHint}</p>
              <p className="px-1 text-[11px] leading-5 text-neutral-500">
                État actuel : l'application n'envoie que des notifications navigateur locales. Il n'y a pas encore de push distant serveur quand l'app est fermée.
              </p> */}
              {notificationMessage ? (
                <p className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] leading-5 text-blue-700">
                  {notificationMessage}
                </p>
              ) : null}

              {[
                {
                  label: "Mode sombre",
                  description: "Activer/désactiver le mode sombre",
                  icon: FiMoon,
                },
                {
                  label: "Appareil",
                  description: "Informations sur l'appareil",
                  icon: FiSmartphone,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3 ring-1 ring-black/5"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <item.icon />
                    </span>
                    <span>
                      <p className="text-sm font-semibold text-neutral-900">{item.label}</p>
                    </span>
                  </span>
                  <FiChevronRight className="text-neutral-400" />
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/compte/offline"
            className="block rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <FiMap />
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Carte & Offline</p>
                <p className="text-xs text-neutral-500">Zones téléchargées</p>
              </div>
            </div>
            {/* <p className="mt-3 text-xs text-neutral-500">
              Tuiles de carte récemment consultées et statut de synchronisation.
            </p> */}
          </Link>
        </motion.section>
      </main>
      {bottomNav}
    </div>
  );
}


