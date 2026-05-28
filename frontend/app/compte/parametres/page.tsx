"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FiArrowLeft,
  FiBell,
  FiChevronRight,
  FiKey,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { AccountSidebar } from "@/components/AccountSidebar";
import { PreferenceControls } from "@/components/PreferenceControls";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useT } from "@/lib/i18n";
import { disablePushNotifications, enablePushNotifications } from "@/lib/pushNotifications";
import {
  getDeviceNotificationPermission,
} from "@/lib/deviceNotifications";
import { useAuthStore } from "@/stores/authStore";
import {
  getNotificationPrefs,
  useNotificationStore,
} from "@/stores/notificationStore";

export default function ParametresPage() {
  const t = useT();
  const bottomNav = <BottomNav />;
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const prefsByUser = useNotificationStore((state) => state.prefsByUser);
  const setOwnerPostNotifications = useNotificationStore(
    (state) => state.setOwnerPostNotifications
  );
  const notificationsEnabled = getNotificationPrefs(prefsByUser, user?.id)
    .ownerPostNotifications;
  const [devicePermission, setDevicePermission] = useState(getDeviceNotificationPermission());
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  const toggleNotifications = async () => {
    if (!user?.id || !token) return;

    const nextEnabled = !notificationsEnabled;
    if (nextEnabled) {
      const result = await enablePushNotifications(token);
      setDevicePermission(result.permission);
      if (!result.ok) {
        setOwnerPostNotifications(user.id, false);
        setNotificationMessage(result.message);
        return;
      }
      setNotificationMessage(result.message);
    } else if (token) {
      await disablePushNotifications(token);
    }
    setOwnerPostNotifications(user.id, nextEnabled);
    setDevicePermission(getDeviceNotificationPermission());
    if (!nextEnabled) {
      setNotificationMessage("Notifications push désactivées pour ce téléphone.");
    }
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
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">{t("settings")}</h1>
            <p className="mt-1 text-sm text-neutral-600">
              {t("appConfiguration")}
            </p>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
            <div className="h-full w-full rounded-full bg-blue-500" />
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
            <h3 className="text-sm font-semibold text-neutral-900">{t("security")}</h3>
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
                    {t("changePassword")}
                  </p>
                </span>
              </span>
              <FiChevronRight className="text-neutral-400" />
            </Link>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-soft">
            <h3 className="text-sm font-semibold text-neutral-900">{t("preferences")}</h3>
            <div className="mt-4 space-y-3">
              <PreferenceControls />
              <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3 ring-1 ring-black/5">
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <FiBell />
                  </span>
                  <span>
                    <p className="text-sm font-semibold text-neutral-900">{t("notifications")}</p>
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationsEnabled}
                  aria-label={`${t("notifications")} ${devicePermission}`}
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
              {notificationMessage ? (
                <p className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] leading-5 text-blue-700">
                  {notificationMessage}
                </p>
              ) : null}
            </div>
          </div>
        </motion.section>
      </main>
      {bottomNav}
    </div>
  );
}


