import { getApiBaseUrl } from "@/lib/api";

export type ConversationSummary = {
  id: string;
  property_id: string;
  owner_id: string;
  tenant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  property_title: string;
  property_city: string;
  last_message_preview?: string | null;
  unread_count: number;
  counterpart_name?: string | null;
  counterpart_role?: string | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at?: string | null;
  created_at: string;
};

export type ConversationDetail = ConversationSummary & {
  messages: ChatMessage[];
};

async function handleResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || fallback);
  }
  return response.json();
}

export async function ensureConversation(token: string, propertyId: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/messages/ensure`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ property_id: propertyId }),
  });
  return handleResponse<ConversationDetail>(response, "Impossible d'ouvrir la conversation.");
}

export async function fetchConversations(token: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/messages`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return handleResponse<ConversationSummary[]>(response, "Impossible de charger les conversations.");
}

export async function fetchConversation(token: string, conversationId: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/messages/${conversationId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return handleResponse<ConversationDetail>(response, "Impossible de charger cette conversation.");
}

export async function sendConversationMessage(
  token: string,
  conversationId: string,
  body: string
) {
  const response = await fetch(`${getApiBaseUrl()}/api/messages/${conversationId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });
  return handleResponse<ChatMessage>(response, "Impossible d'envoyer le message.");
}
