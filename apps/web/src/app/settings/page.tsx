import { Bell, Eye, Shield, SlidersHorizontal } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Pill, SectionCard } from "@/components/ui";

const settingsGroups = [
  {
    title: "Visibility",
    icon: Eye,
    items: ["Show profile in discovery", "Display spiritual values publicly", "Limit city precision"],
  },
  {
    title: "Safety",
    icon: Shield,
    items: ["Request-only messaging", "Blocked users", "Report history"],
  },
  {
    title: "Notifications",
    icon: Bell,
    items: ["New requests", "Accepted requests", "Unread messages"],
  },
];

export default function SettingsPage() {
  return (
    <AppShell
      title="Settings built for trust"
      subtitle="Settings feel like a safety and clarity center, not a dumping ground. The visual grouping helps users understand control over privacy, communication, and notifications."
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-6 md:grid-cols-2">
          {settingsGroups.map(({ title, icon: Icon, items }) => (
            <SectionCard key={title}>
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Icon className="size-4" />
                </div>
                <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
              </div>
              <div className="mt-5 space-y-3">
                {items.map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                    <button className="h-7 w-12 rounded-full bg-slate-900 p-1">
                      <span className="block size-5 rounded-full bg-white" />
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>

        <SectionCard className="h-fit">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <SlidersHorizontal className="size-4" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Account trust</h2>
              <p className="text-sm text-slate-500">Signals users can understand.</p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Profile completion</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">82%</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Trust score</p>
              <div className="mt-2 flex items-center gap-3">
                <p className="text-3xl font-semibold text-slate-950">92</p>
                <Pill tone="soft">Strong</Pill>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
