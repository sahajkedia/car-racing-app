import { AppShell } from "@/components/app-shell";
import { Pill, SectionCard } from "@/components/ui";

const prompts = [
  "What spiritual practices keep you grounded each week?",
  "How do you imagine a peaceful relationship rhythm?",
  "Which values feel non-negotiable in your home life?",
];

export default function OnboardingPage() {
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
            {["Display name", "City", "Age", "Occupation"].map((field) => (
              <label key={field} className="space-y-2 text-sm text-slate-600">
                <span>{field}</span>
                <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" placeholder={field} />
              </label>
            ))}
          </div>
          <label className="mt-4 block space-y-2 text-sm text-slate-600">
            <span>Bio</span>
            <textarea
              className="min-h-32 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3"
              placeholder="Share how you move through life, what brings you peace, and what kind of connection you hope to build."
            />
          </label>
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
