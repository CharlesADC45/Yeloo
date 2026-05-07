"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useAuthStore } from "@/stores/authStore";

type FavoritesState = {
  currentUserKey: string;
  favoriteIds: string[];
  favoritesByUser: Record<string, string[]>;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  clear: () => void;
  rehydrateCurrentUser: () => void;
};

function getFavoritesUserKey() {
  const userId = useAuthStore.getState().user?.id;
  return userId ? `user:${userId}` : "guest";
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      currentUserKey: "guest",
      favoriteIds: [],
      favoritesByUser: {},
      toggleFavorite: (id) => {
        const userKey = get().currentUserKey;
        const current = get().favoritesByUser[userKey] || [];
        const nextFavorites = current.includes(id)
          ? current.filter((value) => value !== id)
          : [...current, id];

        set((state) => ({
          favoriteIds: nextFavorites,
          favoritesByUser: {
            ...state.favoritesByUser,
            [userKey]: nextFavorites,
          },
        }));
      },
      isFavorite: (id) => get().favoriteIds.includes(id),
      clear: () => {
        const userKey = get().currentUserKey;
        set((state) => ({
          favoriteIds: [],
          favoritesByUser: {
            ...state.favoritesByUser,
            [userKey]: [],
          },
        }));
      },
      rehydrateCurrentUser: () => {
        const userKey = getFavoritesUserKey();
        const nextFavorites = get().favoritesByUser[userKey] || [];
        set({
          currentUserKey: userKey,
          favoriteIds: nextFavorites,
        });
      },
    }),
    {
      name: "yeloo-favorites",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUserKey: state.currentUserKey,
        favoriteIds: state.favoriteIds,
        favoritesByUser: state.favoritesByUser,
      }),
      onRehydrateStorage: () => (state) => {
        state?.rehydrateCurrentUser();
      },
    }
  )
);

useAuthStore.subscribe((state, previousState) => {
  const currentUserId = state.user?.id ?? null;
  const previousUserId = previousState.user?.id ?? null;
  if (currentUserId !== previousUserId) {
    useFavoritesStore.getState().rehydrateCurrentUser();
  }
});
