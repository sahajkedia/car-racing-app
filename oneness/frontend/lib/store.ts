/**
 * Global app state — Zustand store.
 * Persists auth tokens to localStorage; UI state is in-memory only.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProfileOut } from "./api";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  setSession: (access: string, refresh: string, userId: string) => void;
  clearSession: () => void;
}

interface ProfileState {
  profile: ProfileOut | null;
  setProfile: (p: ProfileOut | null) => void;
}

interface OnboardingState {
  currentStep: string;
  setCurrentStep: (step: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      setSession: (accessToken, refreshToken, userId) => {
        // Also write to localStorage for the API client
        localStorage.setItem("oneness_token", accessToken);
        set({ accessToken, refreshToken, userId });
      },
      clearSession: () => {
        localStorage.removeItem("oneness_token");
        set({ accessToken: null, refreshToken: null, userId: null });
      },
    }),
    { name: "oneness-auth" }
  )
);

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: "photos",
  setCurrentStep: (step) => set({ currentStep: step }),
}));
