"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export function AuthSync() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const pathname = usePathname();

  useEffect(() => {
    if (!token) return;
    let isActive = true;

    const syncUser = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (response.status === 401) {
            logout();
          }
          return;
        }
        const user = await response.json();
        if (!isActive) return;
        setUser({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          role: user.role,
          profile_image_url: user.profile_image_url,
          is_verified: user.is_verified,
          owner_verification_status: user.owner_verification_status,
        });
      } catch {
        if (!isActive) return;
      }
    };

    syncUser();

    return () => {
      isActive = false;
    };
  }, [token, pathname, setUser, logout]);

  return null;
}
