"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type FavoritesState = {
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  clear: () => void;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      toggleFavorite: (id) => {
        const current = get().favoriteIds;
        set({
          favoriteIds: current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id],
        });
      },
      isFavorite: (id) => get().favoriteIds.includes(id),
      clear: () => set({ favoriteIds: [] }),
    }),
    {
      name: "yeloo-favorites",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

