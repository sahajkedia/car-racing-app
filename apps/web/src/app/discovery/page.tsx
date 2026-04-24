"use client";

import { useEffect, useState } from "react";
import { Compass, MapPin, Sparkles } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Pill, SectionCard } from "@/components/ui";
import { createMessageRequest, getCandidates, getStoredToken, type Candidate } from "@/lib/api";

export default function DiscoveryPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const token = getStoredToken();

  useEffect(() => {
    if (!token) {
      return;
    }

    getCandidates(token)
      .then((response) => {
        setCandidates(response.candidates);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load candidates");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  async function handleSendRequest(candidate: Candidate) {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setError("Sign in first to send requests.");
      return;
    }

    try {
      await createMessageRequest(currentToken, {
        recipient_id: candidate.user_id,
        intro_message: `Hi ${candidate.display_name}, I resonated with your profile and would like to begin with a respectful conversation.`,
      });
      setStatusMessage(`Request sent to ${candidate.display_name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send request");
    }
  }

  return (
    <AppShell
      title="Discovery feels intentional"
      subtitle="Candidate cards emphasize trust, values, and compatibility instead of trying to feel addictive. The information hierarchy is meant to slow the user down in a good way."
    >
      <SectionCard className="grid gap-4 md:grid-cols-4">
        {["Quiet mornings", "Meditation", "Values-led life", "Age 26-32"].map((filter) => (
          <div key={filter} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700">
            {filter}
          </div>
        ))}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          {token && loading ? <SectionCard>Loading candidates...</SectionCard> : null}
          {!token ? <SectionCard>Sign in on /auth to load real discovery candidates.</SectionCard> : null}
          {!loading && candidates.length === 0 ? (
            <SectionCard>No candidates found yet. Complete onboarding data first.</SectionCard>
          ) : null}
          {candidates.map((candidate) => (
            <SectionCard key={candidate.user_id}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="flex size-18 shrink-0 items-center justify-center rounded-[24px] bg-[linear-gradient(180deg,#e2e8f0,#cbd5e1)] text-lg font-semibold text-slate-900">
                    {candidate.display_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-semibold text-slate-950">
                        {candidate.display_name}, {candidate.age}
                      </h2>
                      <Pill tone="soft">{Math.round(candidate.score * 10) / 10} score</Pill>
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="size-4" />
                      {candidate.city}
                    </p>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
                      {candidate.bio || "Profile details are still being completed."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(candidate.values.length ? candidate.values : ["Intentional", "Values-led"]).map((tag) => (
                        <Pill key={tag}>{tag}</Pill>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 lg:flex-col">
                  <button
                    onClick={() => handleSendRequest(candidate)}
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                  >
                    Send request
                  </button>
                  <button className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
                    View profile
                  </button>
                </div>
              </div>
            </SectionCard>
          ))}
          {error ? <SectionCard className="text-sm text-rose-700">{error}</SectionCard> : null}
          {statusMessage ? <SectionCard className="text-sm text-emerald-700">{statusMessage}</SectionCard> : null}
        </div>

        <SectionCard className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Compass className="size-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-950">Why this layout works</h3>
              <p className="text-sm text-slate-500">Designed for emotional clarity.</p>
            </div>
          </div>
          <div className="space-y-3 text-sm leading-7 text-slate-600">
            <p>
              The candidate cards use strong breathing room, rounded surfaces, and quiet visual contrast so profiles feel premium and trustworthy instead of gamified.
            </p>
            <p>
              Trust and alignment signals are placed near the name, while the summary and tags reinforce compatibility without overwhelming the user.
            </p>
          </div>
          <div className="rounded-[24px] bg-amber-50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <Sparkles className="size-4" />
              Future-ready
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              This page is already shaped to plug into your backend discovery ranking and message-request flow cleanly.
            </p>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
