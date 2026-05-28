import { getApiBaseUrl } from "@/lib/api";

type PushSetupResult =
  | { ok: true; permission: NotificationPermission; message: string }
  | { ok: false; permission: NotificationPermission | "unsupported"; message: string };

type VapidKeyResponse = {
  public_key: string | null;
  configured: boolean;
};

function canUsePushNotifications() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function fetchVapidPublicKey(token: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/push/vapid-public-key`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as VapidKeyResponse;
}

async function saveSubscription(token: string, subscription: PushSubscription) {
  const payload = subscription.toJSON();
  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
    throw new Error("Abonnement push incomplet.");
  }

  const response = await fetch(`${getApiBaseUrl()}/api/push/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoint: payload.endpoint,
      keys: {
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
      },
      user_agent: navigator.userAgent,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "Abonnement push impossible.");
  }
}

export async function enablePushNotifications(token: string): Promise<PushSetupResult> {
  if (!canUsePushNotifications()) {
    return {
      ok: false,
      permission: "unsupported",
      message: "Les notifications push ne sont pas supportées sur cet appareil.",
    };
  }

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;

  if (permission !== "granted") {
    return {
      ok: false,
      permission,
      message:
        permission === "denied"
          ? "Les notifications sont bloquées. Autorisez-les dans les réglages du navigateur."
          : "Les notifications n'ont pas encore été autorisées.",
    };
  }

  const vapid = await fetchVapidPublicKey(token);
  if (!vapid?.configured || !vapid.public_key) {
    return {
      ok: false,
      permission,
      message: "Les clés Web Push ne sont pas encore configurées côté serveur.",
    };
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid.public_key),
    }));

  await saveSubscription(token, subscription);

  return {
    ok: true,
    permission,
    message: "Notifications push activées pour ce téléphone.",
  };
}

export async function disablePushNotifications(token: string) {
  if (!canUsePushNotifications()) return;

  const registration = await navigator.serviceWorker.ready.catch(() => null);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await fetch(`${getApiBaseUrl()}/api/push/subscriptions/delete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => undefined);

  await subscription.unsubscribe().catch(() => undefined);
}
