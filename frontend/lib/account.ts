import { getApiBaseUrl } from "@/lib/api";

type AccountUpdatePayload = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export async function updateMyAccount(token: string, payload: AccountUpdatePayload) {
  const response = await fetch(`${getApiBaseUrl()}/api/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || "Impossible de modifier le profil.");
  }

  return response.json();
}

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
