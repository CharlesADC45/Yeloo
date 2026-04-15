"use client";

type DeviceNotificationPayload = {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  icon?: string;
  badge?: string;
};

export function canUseDeviceNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getDeviceNotificationPermission() {
  if (!canUseDeviceNotifications()) return "unsupported";
  return Notification.permission;
}

export async function requestDeviceNotificationPermission() {
  if (!canUseDeviceNotifications()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export async function showDeviceNotification({
  title,
  body,
  tag,
  url,
  icon = "/icons/icon-192.png",
  badge = "/icons/icon-192.png",
}: DeviceNotificationPayload) {
  if (!canUseDeviceNotifications() || Notification.permission !== "granted") return false;

  const registration =
    "serviceWorker" in navigator ? await navigator.serviceWorker.ready.catch(() => null) : null;

  if (registration?.showNotification) {
    await registration.showNotification(title, {
      body,
      tag,
      icon,
      badge,
      data: { url },
    });
    return true;
  }

  const notification = new Notification(title, {
    body,
    tag,
    icon,
    data: { url },
  });

  notification.onclick = () => {
    if (url) {
      window.focus();
      window.location.href = url;
    }
  };
  return true;
}
