import { getApiBaseUrl } from "@/lib/api";

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string
) {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/change-password`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || "Impossible de changer le mot de passe.");
  }
}
