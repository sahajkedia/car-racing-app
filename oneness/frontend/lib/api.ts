/**
 * Typed API client for the Oneness FastAPI backend.
 * Reads the access token from localStorage (set after OTP verification).
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("oneness_token");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export const api = {
  // Auth
  sendOtp: (phone: string) =>
    request("POST", "/auth/send-otp", { phone }),

  verifyOtp: (phone: string, token: string) =>
    request<{ access_token: string; refresh_token: string; user_id: string; is_new_user: boolean }>(
      "POST", "/auth/verify-otp", { phone, token }
    ),

  // Onboarding
  uploadPhotos: async (files: File[]) => {
    const token = getToken();
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const res = await fetch(`${BASE}/profiles/onboarding/photos`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) throw new Error((await res.json()).detail);
    return res.json();
  },

  saveBasics: (data: {
    name: string; dob: string; gender: string; interested_in_gender: string;
  }) => request("POST", "/profiles/onboarding/basics", data),

  saveLocation: (data: {
    city: string; state: string; latitude?: number; longitude?: number;
  }) => request("POST", "/profiles/onboarding/location", data),

  saveIntent: (data: {
    looking_for: string; height_cm: number;
    min_height_cm?: number; max_height_cm?: number;
    min_age?: number; max_age?: number;
  }) => request("POST", "/profiles/onboarding/intent", data),

  saveAbout: (data: {
    about_me: string; job_title?: string; degree?: string; salary_bracket?: string;
  }) => request("POST", "/profiles/onboarding/about", data),

  saveSpiritual: (data: {
    ie_status: string; daily_practices: string[];
    diet: string; commitment_level: string;
  }) => request("POST", "/profiles/onboarding/spiritual", data),

  // Matching
  getSangha: () => request<{ sangha: ProfileCard[]; cached: boolean }>("GET", "/matching/sangha"),

  logSignal: (data: {
    to_profile_id: string; signal_type: string;
    session_id?: string; metadata?: Record<string, unknown>;
  }) => request("POST", "/matching/signal", data),

  // Messages
  sendMessage: (to_profile_id: string, content: string) =>
    request("POST", "/messages/", { to_profile_id, content }),

  getThreads: () => request<{ threads: Thread[] }>("GET", "/messages/threads"),

  getThread: (profile_id: string) =>
    request<{ messages: Message[] }>("GET", `/messages/${profile_id}`),

  markRead: (profile_id: string) =>
    request("PATCH", `/messages/${profile_id}/read`, {}),

  reportRelationship: (about_profile_id: string, outcome: string) =>
    request("POST", "/messages/report", { about_profile_id, outcome }),

  // Profile
  getMyProfile: () => request<ProfileOut>("GET", "/profiles/me"),
};

// Types matching backend schemas
export interface PhotoOut { id: string; url: string; position: number; }

export interface ProfileCard {
  id: string; name: string; age?: number; dob?: string;
  gender: string; city: string; height_cm?: number;
  about_me?: string; job_title?: string;
  looking_for: string; ie_status: string;
  daily_practices: string[]; diet: string;
  commitment_level: string; photos: PhotoOut[];
  compatibility_score: number;
}

export interface ProfileOut extends ProfileCard {
  onboarding_step: string; onboarding_complete: boolean;
  salary_bracket?: string; last_active_at?: string;
}

export interface Thread {
  other_profile_id: string; last_message: string;
  last_message_at: string; unread: number;
}

export interface Message {
  id: string; from_profile_id: string; to_profile_id: string;
  content: string; is_read: boolean; created_at: string;
}
