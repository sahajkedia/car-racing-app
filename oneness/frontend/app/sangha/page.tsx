"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ProfileCard } from "@/lib/api";
import { playSound } from "@/lib/sounds";
import ProfileCardComponent from "@/components/sangha/ProfileCard";
import ProfileDetail from "@/components/sangha/ProfileDetail";

export default function SanghaPage() {
  const router = useRouter();
  const [sangha, setSangha] = useState<ProfileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProfileCard | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getSangha();
        setSangha(res.sangha ?? []);
      } catch (e) {
        // Not authenticated — redirect
        router.push("/auth");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  function openProfile(card: ProfileCard) {
    playSound("tap");
    setSelected(card);
    // Log profile_viewed signal
    api.logSignal({
      to_profile_id: card.id,
      signal_type: "profile_viewed",
      session_id: sessionId ?? undefined,
    }).catch(() => {});
  }

  function onExpressInterest(card: ProfileCard) {
    playSound("success");
    api.logSignal({
      to_profile_id: card.id,
      signal_type: "express_interest",
      session_id: sessionId ?? undefined,
    }).catch(() => {});
    setSelected(null);
    // Navigate to message thread
    router.push(`/messages/${card.id}`);
  }

  function onSilentPass(card: ProfileCard) {
    playSound("pass");
    api.logSignal({
      to_profile_id: card.id,
      signal_type: "silent_pass",
      session_id: sessionId ?? undefined,
    }).catch(() => {});
    setSelected(null);
    setSangha((prev) => prev.filter((p) => p.id !== card.id));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-500 text-sm">Curating your Sangha…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0D0D0D]/90 backdrop-blur-sm px-6 pt-8 pb-4 border-b border-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-amber-300 text-xl font-light tracking-wide">Daily Sangha</h1>
            <p className="text-zinc-600 text-xs mt-0.5">
              {sangha.length} people · refreshes in 24h
            </p>
          </div>
          <button
            onClick={() => { playSound("tap"); router.push("/messages"); }}
            className="relative p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Profile grid */}
      <div className="px-4 py-6">
        {sangha.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-zinc-400">No profiles in your Sangha yet.</p>
            <p className="text-zinc-600 text-sm">
              The app is growing. Invite friends from the Isha community to join.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sangha.map((card) => (
              <ProfileCardComponent
                key={card.id}
                card={card}
                onClick={() => openProfile(card)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Profile detail drawer */}
      {selected && (
        <ProfileDetail
          card={selected}
          onClose={() => setSelected(null)}
          onExpressInterest={() => onExpressInterest(selected)}
          onSilentPass={() => onSilentPass(selected)}
        />
      )}
    </div>
  );
}
