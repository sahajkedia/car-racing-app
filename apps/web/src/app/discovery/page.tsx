import { Compass, MapPin, Sparkles } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Pill, SectionCard } from "@/components/ui";

const candidates = [
  {
    name: "Kavya",
    age: 28,
    city: "Pune",
    summary: "Drawn to meditation, service, and small intentional communities.",
    tags: ["Vedanta", "Service", "Calm routines"],
    score: "92% alignment",
  },
  {
    name: "Meera",
    age: 30,
    city: "Bengaluru",
    summary: "Values simplicity, prayer, and emotionally honest communication.",
    tags: ["Prayer", "Minimal living", "Family grounded"],
    score: "88% alignment",
  },
  {
    name: "Ananya",
    age: 27,
    city: "Mumbai",
    summary: "A warm conversationalist with a reflective lifestyle and strong intention.",
    tags: ["Mindfulness", "Art", "Meaningful partnership"],
    score: "84% alignment",
  },
];

export default function DiscoveryPage() {
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
          {candidates.map((candidate) => (
            <SectionCard key={candidate.name}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="flex size-18 shrink-0 items-center justify-center rounded-[24px] bg-[linear-gradient(180deg,#e2e8f0,#cbd5e1)] text-lg font-semibold text-slate-900">
                    {candidate.name.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-semibold text-slate-950">
                        {candidate.name}, {candidate.age}
                      </h2>
                      <Pill tone="soft">{candidate.score}</Pill>
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="size-4" />
                      {candidate.city}
                    </p>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
                      {candidate.summary}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {candidate.tags.map((tag) => (
                        <Pill key={tag}>{tag}</Pill>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 lg:flex-col">
                  <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                    Send request
                  </button>
                  <button className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
                    View profile
                  </button>
                </div>
              </div>
            </SectionCard>
          ))}
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
