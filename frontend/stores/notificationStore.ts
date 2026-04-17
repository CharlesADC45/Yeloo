"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationItem = {
  id: string;
  type: "owner_post" | "owner_verification";
  title: string;
  message: string;
  propertyId?: string | null;
  createdAt: string;
  ownerId?: string | null;
  ownerName?: string | null;
  city?: string | null;
  imageUrl?: string | null;
  targetUserId?: string | null;
  href?: string | null;
  severity?: "info" | "warning" | "success" | "error";
};

type NotificationPrefs = {
  ownerPostNotifications: boolean;
};

type NotificationState = {
  items: NotificationItem[];
  readByUser: Record<string, string[]>;
  prefsByUser: Record<string, NotificationPrefs>;
  pushOwnerPost: (payload: {
    propertyId: string;
    title: string;
    city?: string | null;
    ownerId?: string | null;
    ownerName?: string | null;
    imageUrl?: string | null;
  }) => void;
  pushOwnerVerificationRejection: (payload: {
    profileId: string;
    userId: string;
    notes?: string | null;
    reviewedAt?: string | null;
  }) => void;
  markRead: (userId: string, notificationId: string) => void;
  markAllRead: (userId: string) => void;
  setOwnerPostNotifications: (userId: string, enabled: boolean) => void;
};

const DEFAULT_PREFS: NotificationPrefs = {
  ownerPostNotifications: true,
};

const buildId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      items: [],
      readByUser: {},
      prefsByUser: {},
      pushOwnerPost: ({ propertyId, title, city, ownerId, ownerName, imageUrl }) => {
        const item: NotificationItem = {
          id: buildId(),
          type: "owner_post",
          title: "Nouvelle annonce disponible",
          message: `${title}${city ? ` · ${city}` : ""}`,
          propertyId,
          createdAt: new Date().toISOString(),
          ownerId,
          ownerName,
          city: city ?? null,
          imageUrl: imageUrl ?? null,
        };

        set((state) => ({
          items: [item, ...state.items].slice(0, 80),
        }));
      },
      pushOwnerVerificationRejection: ({ profileId, userId, notes, reviewedAt }) => {
        const id = `owner-verification-rejected:${profileId}:${reviewedAt || "latest"}`;
        const item: NotificationItem = {
          id,
          type: "owner_verification",
          title: "Vérification refusée",
          message:
            notes?.trim() ||
            "Votre dossier propriétaire a été refusé. Ouvrez votre espace pour le corriger.",
          createdAt: reviewedAt || new Date().toISOString(),
          targetUserId: userId,
          href: "/proprietaire",
          severity: "error",
        };

        set((state) => {
          if (state.items.some((current) => current.id === id)) return state;
          return {
            items: [item, ...state.items].slice(0, 80),
          };
        });
      },
      markRead: (userId, notificationId) => {
        if (!userId) return;
        set((state) => {
          const current = state.readByUser[userId] ?? [];
          if (current.includes(notificationId)) return state;
          return {
            readByUser: {
              ...state.readByUser,
              [userId]: [...current, notificationId],
            },
          };
        });
      },
      markAllRead: (userId) => {
        if (!userId) return;
        const ids = get().items.map((item) => item.id);
        set((state) => ({
          readByUser: {
            ...state.readByUser,
            [userId]: ids,
          },
        }));
      },
      setOwnerPostNotifications: (userId, enabled) => {
        if (!userId) return;
        set((state) => ({
          prefsByUser: {
            ...state.prefsByUser,
            [userId]: {
              ...(state.prefsByUser[userId] ?? DEFAULT_PREFS),
              ownerPostNotifications: enabled,
            },
          },
        }));
      },
    }),
    {
      name: "yeloo-notifications",
      partialize: (state) => ({
        items: state.items,
        readByUser: state.readByUser,
        prefsByUser: state.prefsByUser,
      }),
    }
  )
);

export const getNotificationPrefs = (
  prefsByUser: Record<string, NotificationPrefs>,
  userId?: string | null
) => {
  if (!userId) return DEFAULT_PREFS;
  return prefsByUser[userId] ?? DEFAULT_PREFS;
};

export const getUnreadNotifications = (
  items: NotificationItem[],
  readByUser: Record<string, string[]>,
  userId?: string | null
) => {
  if (!userId) return [];
  const readIds = new Set(readByUser[userId] ?? []);
  return items.filter((item) => !readIds.has(item.id));
};
