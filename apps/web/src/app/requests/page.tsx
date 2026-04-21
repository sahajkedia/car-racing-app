import { Clock3, HeartHandshake, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Pill, SectionCard } from "@/components/ui";

const requests = [
  {
    name: "Naina",
    intro: "You seem grounded, warm, and intentional. I would love to begin with a respectful conversation.",
    time: "2h ago",
  },
  {
    name: "Ishita",
    intro: "I resonated with your values around service and family-centered partnership.",
    time: "Yesterday",
  },
];

export default function RequestsPage() {
  return (
    <AppShell
      title="Message requests"
      subtitle="This view keeps the first-contact experience respectful. Requests are readable, calm, and easy to evaluate without pressure."
    >
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          {requests.map((request) => (
            <SectionCard key={request.name}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-slate-950">{request.name}</h2>
                    <Pill tone="soft">Pending</Pill>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <Clock3 className="size-4" />
                    {request.time}
                  </p>
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">{request.intro}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                  Accept request
                </button>
                <button className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
                  Decline
                </button>
                <button className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
                  Block
                </button>
              </div>
            </SectionCard>
          ))}
        </div>

        <div className="space-y-6">
          <SectionCard>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <HeartHandshake className="size-5" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Trust-forward inbox</h3>
                <p className="text-sm text-slate-500">Why this screen feels safer.</p>
              </div>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <li>Readable first messages without dark patterns.</li>
              <li>Actions are clear, separated, and emotionally neutral.</li>
              <li>Block/report can become one tap from here in later iterations.</li>
            </ul>
          </SectionCard>

          <SectionCard className="bg-slate-900 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <ShieldCheck className="size-4" />
              Safety controls
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              This panel can later connect to backend trust signals like request frequency, verified identity, moderation status, and shared community context.
            </p>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
