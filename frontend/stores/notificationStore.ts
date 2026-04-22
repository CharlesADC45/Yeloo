"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationItem = {
  id: string;
  type: "owner_post" | "owner_verification" | "message" | "visit_request" | "visit_update" | "property_status";
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
  pushMessageNotification: (payload: {
    userId: string;
    conversationId: string;
    title: string;
    preview?: string | null;
    updatedAt?: string | null;
  }) => void;
  pushVisitRequestNotification: (payload: {
    userId: string;
    visitRequestId: string;
    propertyTitle: string;
    tenantName: string;
    createdAt?: string | null;
  }) => void;
  pushVisitUpdateNotification: (payload: {
    userId: string;
    visitRequestId: string;
    status: string;
    propertyTitle: string;
    updatedAt?: string | null;
  }) => void;
  pushPropertyStatusNotification: (payload: {
    userId: string;
    propertyId: string;
    title: string;
    statusLabel: string;
    changedAt?: string | null;
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
      pushMessageNotification: ({ userId, conversationId, title, preview, updatedAt }) => {
        const id = `message:${conversationId}:${updatedAt || "latest"}`;
        const item: NotificationItem = {
          id,
          type: "message",
          title: title || "Nouveau message",
          message: preview?.trim() || "Vous avez recu un nouveau message.",
          createdAt: updatedAt || new Date().toISOString(),
          targetUserId: userId,
          href: `/messages/${conversationId}`,
          severity: "info",
        };

        set((state) => {
          if (state.items.some((current) => current.id === id)) return state;
          return {
            items: [item, ...state.items].slice(0, 80),
          };
        });
      },
      pushVisitRequestNotification: ({ userId, visitRequestId, propertyTitle, tenantName, createdAt }) => {
        const id = `visit-request:${visitRequestId}:${createdAt || "latest"}`;
        const item: NotificationItem = {
          id,
          type: "visit_request",
          title: "Nouvelle demande de visite",
          message: `${tenantName || "Un locataire"} veut visiter ${propertyTitle}.`,
          createdAt: createdAt || new Date().toISOString(),
          targetUserId: userId,
          href: "/proprietaire",
          severity: "info",
        };

        set((state) => {
          if (state.items.some((current) => current.id === id)) return state;
          return {
            items: [item, ...state.items].slice(0, 80),
          };
        });
      },
      pushVisitUpdateNotification: ({ userId, visitRequestId, status, propertyTitle, updatedAt }) => {
        const id = `visit-update:${visitRequestId}:${status}:${updatedAt || "latest"}`;
        const statusLabel =
          status === "accepted"
            ? "acceptée"
            : status === "declined"
              ? "refusée"
              : status === "rescheduled"
                ? "modifiée"
                : "mise à jour";
        const item: NotificationItem = {
          id,
          type: "visit_update",
          title: "Votre visite a été mise à jour",
          message: `La visite pour ${propertyTitle} est ${statusLabel}.`,
          createdAt: updatedAt || new Date().toISOString(),
          targetUserId: userId,
          href: "/messages",
          severity: status === "declined" ? "warning" : "success",
        };

        set((state) => {
          if (state.items.some((current) => current.id === id)) return state;
          return {
            items: [item, ...state.items].slice(0, 80),
          };
        });
      },
      pushPropertyStatusNotification: ({ userId, propertyId, title, statusLabel, changedAt }) => {
        const id = `property-status:${propertyId}:${statusLabel}:${changedAt || "latest"}`;
        const item: NotificationItem = {
          id,
          type: "property_status",
          title: "Statut du logement modifié",
          message: `${title} est maintenant ${statusLabel.toLowerCase()}.`,
          propertyId,
          createdAt: changedAt || new Date().toISOString(),
          targetUserId: userId,
          href: `/logements/${propertyId}`,
          severity: "info",
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
