"use client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8080";

const TOKEN_STORAGE_KEY = "spiritualmeet_token";

type RequestMethod = "GET" | "POST" | "PUT";

type APIErrorBody = {
  error?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  display_name: string;
  gender: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type Candidate = {
  user_id: string;
  display_name: string;
  age: number;
  city: string;
  bio: string;
  values: string[];
  score: number;
};

export type MessageRequest = {
  id: string;
  sender_id: string;
  recipient_id: string;
  intro_message: string;
  status: string;
  sender_name?: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  other_display_name: string;
  other_user_id: string;
  last_message_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type DiscoveryContext = {
  user: AuthUser;
  profile: {
    bio: string;
    city: string;
    country: string;
    language: string;
    age: number;
    occupation: string;
    looking_for: string;
  };
};

async function apiRequest<T>(path: string, method: RequestMethod, body?: unknown, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const errorBody = (await response.json()) as APIErrorBody;
      if (errorBody.error) {
        message = errorBody.error;
      }
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function register(input: {
  email: string;
  password: string;
  display_name: string;
  gender: string;
}) {
  return apiRequest<AuthResponse>("/v1/auth/register", "POST", input);
}

export async function login(input: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/v1/auth/login", "POST", input);
}

export async function getCandidates(token: string) {
  return apiRequest<{ candidates: Candidate[] }>("/v1/discovery/candidates", "GET", undefined, token);
}

export async function getMe(token: string) {
  return apiRequest<DiscoveryContext>("/v1/me", "GET", undefined, token);
}

export async function upsertProfile(
  token: string,
  input: {
    bio: string;
    city: string;
    country: string;
    language: string;
    age: number;
    occupation: string;
    looking_for: string;
  },
) {
  return apiRequest("/v1/me/profile", "PUT", input, token);
}

export async function createMessageRequest(token: string, input: { recipient_id: string; intro_message: string }) {
  return apiRequest<MessageRequest>("/v1/message-requests", "POST", input, token);
}

export async function getInboxRequests(token: string) {
  return apiRequest<{ requests: MessageRequest[] }>("/v1/message-requests/inbox", "GET", undefined, token);
}

export async function respondToRequest(token: string, requestId: string, accept: boolean) {
  const action = accept ? "accept" : "reject";
  return apiRequest<{ request: MessageRequest; conversation?: Conversation }>(
    `/v1/message-requests/${requestId}/${action}`,
    "POST",
    {},
    token,
  );
}

export async function blockUser(token: string, blocked_user_id: string) {
  return apiRequest<{ status: string }>("/v1/blocks", "POST", { blocked_user_id }, token);
}

export async function getConversations(token: string) {
  return apiRequest<{ conversations: Conversation[] }>("/v1/conversations", "GET", undefined, token);
}

export async function getMessages(token: string, conversationId: string) {
  return apiRequest<{ messages: Message[] }>(`/v1/conversations/${conversationId}/messages`, "GET", undefined, token);
}

export async function sendMessage(token: string, conversationId: string, body: string) {
  return apiRequest<Message>(`/v1/conversations/${conversationId}/messages`, "POST", { body }, token);
}
