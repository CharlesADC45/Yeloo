"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthUser = {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  role?: string | null;
  profile_image_url?: string | null;
  is_verified?: boolean | null;
  owner_verification_status?: string | null;
};

type AuthState = {
  isAuthenticated: boolean;
  token: string | null;
  user: AuthUser | null;
  setAuthenticated: (value: boolean) => void;
  setToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setSession: (user: AuthUser, token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      user: null,
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      setSession: (user, token) =>
        set({ isAuthenticated: true, user, token }),
      logout: () => set({ isAuthenticated: false, user: null, token: null }),
    }),
    {
      name: "yeloo-auth",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        token: state.token,
        user: state.user,
      }),
    }
  )
);

