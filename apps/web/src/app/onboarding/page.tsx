"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Pill, SectionCard } from "@/components/ui";
import { getMe, getStoredToken, upsertProfile } from "@/lib/api";

const prompts = [
  "What spiritual practices keep you grounded each week?",
  "How do you imagine a peaceful relationship rhythm?",
  "Which values feel non-negotiable in your home life?",
];

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  const [bio, setBio] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const token = getStoredToken();

  useEffect(() => {
    if (!token) {
      return;
    }

    getMe(token)
      .then((me) => {
        setDisplayName(me.user.display_name || "");
        setCity(me.profile.city || "");
        setAge(me.profile.age ? String(me.profile.age) : "");
        setOccupation(me.profile.occupation || "");
        setBio(me.profile.bio || "");
      })
      .catch(() => {
        // First-time users may not have profile rows yet.
      });
  }, [token]);

  async function handleSaveProfile() {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setError("You must be signed in.");
      return;
    }

    setError("");
    setStatusMessage("");
    try {
      await upsertProfile(currentToken, {
        bio,
        city,
        country: "India",
        language: "English",
        age: Number(age || 0),
        occupation,
        looking_for: "Meaningful partnership",
      });
      setStatusMessage("Profile saved. You can now load discovery candidates.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    }
  }

  return (
    <AppShell
      title="Build a profile that feels like you"
      subtitle="The onboarding flow is thoughtful and editorial, designed to pull out values and emotional clarity instead of reducing people to shallow filters."
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-950">Core profile</h2>
            <Pill tone="soft">Step 1 of 3</Pill>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-600">
              <span>Display name</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                placeholder="Display name"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span>City</span>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                placeholder="City"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span>Age</span>
              <input
                type="number"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                placeholder="Age"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span>Occupation</span>
              <input
                value={occupation}
                onChange={(event) => setOccupation(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                placeholder="Occupation"
              />
            </label>
          </div>
          <label className="mt-4 block space-y-2 text-sm text-slate-600">
            <span>Bio</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="min-h-32 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3"
              placeholder="Share how you move through life, what brings you peace, and what kind of connection you hope to build."
            />
          </label>
          <div className="mt-4 flex items-center gap-3">
            {!token ? <p className="text-sm text-slate-600">Sign in on /auth before saving profile.</p> : null}
            <button
              onClick={handleSaveProfile}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Save profile
            </button>
            {statusMessage ? <p className="text-sm text-emerald-700">{statusMessage}</p> : null}
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </div>
        </SectionCard>

        <SectionCard>
          <h2 className="text-xl font-semibold text-slate-950">Spiritual rhythm</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Meditation", "Seva", "Prayer", "Scripture", "Mindfulness", "Retreats"].map((item) => (
              <Pill key={item}>{item}</Pill>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            {prompts.map((prompt) => (
              <div key={prompt} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-medium text-slate-900">{prompt}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  This becomes structured onboarding in the next pass, but the layout already supports a calm guided interview.
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
