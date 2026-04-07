import { getApiBaseUrl } from "@/lib/api";

export type PublicModule = {
  key: string;
  name: string;
  description: string;
  category: string;
  is_enabled: boolean;
  updated_at: string;
};

export async function fetchPublicModules(): Promise<PublicModule[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/users/modules`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Impossible de charger les modules.");
  }

  return (await response.json()) as PublicModule[];
}
