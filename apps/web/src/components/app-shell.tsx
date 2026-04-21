import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bell,
  Compass,
  HeartHandshake,
  MessageCircleMore,
  Settings,
  UserRound,
} from "lucide-react";

import { Brand } from "@/components/brand";
import { Pill, SectionCard } from "@/components/ui";

const navItems = [
  { href: "/discovery", label: "Discover", icon: Compass },
  { href: "/requests", label: "Requests", icon: HeartHandshake },
  { href: "/chat", label: "Chat", icon: MessageCircleMore },
  { href: "/onboarding", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1520px] gap-6 px-4 py-4 lg:px-6">
      <aside className="hidden w-[280px] shrink-0 lg:block">
        <SectionCard className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col justify-between p-5">
          <div className="space-y-8">
            <Brand />
            <div className="rounded-[24px] bg-[radial-gradient(circle_at_top,#fef3c7,transparent_38%),linear-gradient(180deg,#0f172a,#1e293b)] p-5 text-white">
              <p className="text-sm text-slate-300">Designed to feel gentle, safe, and intentional.</p>
              <p className="mt-5 text-2xl font-semibold leading-tight">
                Build meaningful introductions before conversations begin.
              </p>
            </div>
            <nav className="space-y-2">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-4" />
                    {label}
                  </span>
                  {label === "Requests" ? <Pill tone="soft">4</Pill> : null}
                </Link>
              ))}
            </nav>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Trust-first product note</p>
            <p className="mt-2">
              Request-based messaging, thoughtful prompts, and clean signals make the experience calmer.
            </p>
          </div>
        </SectionCard>
      </aside>

      <main className="min-w-0 flex-1 space-y-6">
        <SectionCard className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3 lg:hidden">
              <Brand />
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700">
              <Bell className="size-4" />
            </button>
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5">
              <div className="flex size-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                AK
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Aarav</p>
                <p className="text-xs text-slate-500">Trust score 92%</p>
              </div>
            </div>
          </div>
        </SectionCard>
        {children}
      </main>
    </div>
  );
}
