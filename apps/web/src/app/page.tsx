import Link from "next/link";
import {
  ArrowRight,
  Compass,
  HeartHandshake,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Brand } from "@/components/brand";
import { Eyebrow, Pill, PrimaryButton, SectionCard, SecondaryButton } from "@/components/ui";

const trustPillars = [
  {
    title: "Request-based messaging",
    copy: "Every first message feels respectful. Conversations open only after a recipient chooses in.",
    icon: HeartHandshake,
  },
  {
    title: "Gentle discovery",
    copy: "Browse people through values, spiritual rhythm, and lifestyle compatibility instead of noisy swiping.",
    icon: Compass,
  },
  {
    title: "Clear trust signals",
    copy: "Profiles highlight intent, consistency, and alignment so people feel safer from the first glance.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-6 px-4 py-4 lg:px-6">
      <SectionCard className="overflow-hidden px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Brand />
            <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <Link href="/discovery">Discovery</Link>
              <Link href="/requests">Requests</Link>
              <Link href="/chat">Chat</Link>
              <Link href="/onboarding">Onboarding</Link>
              <Link href="/settings">Settings</Link>
            </nav>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
            <div className="space-y-6 rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.72))] p-2">
              <Eyebrow>Minimal trust-first design</Eyebrow>
              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
                  A calmer way to meet people who feel aligned with your values.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-600">
                  Saanjh blends spiritual compatibility, thoughtful introductions, and elegant messaging into a warm web experience that feels safe, beautiful, and deeply relatable.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/auth">
                  <PrimaryButton>
                    Start your profile
                    <ArrowRight className="ml-2 size-4" />
                  </PrimaryButton>
                </Link>
                <Link href="/discovery">
                  <SecondaryButton>Preview the app</SecondaryButton>
                </Link>
              </div>
              <div className="flex flex-wrap gap-3">
                <Pill tone="soft">Intentional introductions</Pill>
                <Pill>Spiritual fit signals</Pill>
                <Pill>Elegant, low-noise chat</Pill>
              </div>
            </div>

            <SectionCard className="relative overflow-hidden border-0 bg-[linear-gradient(180deg,#0f172a,#1e293b)] text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.25),transparent_30%)]" />
              <div className="relative space-y-5">
                <Pill tone="dark">Live product snapshot</Pill>
                <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur">
                  <p className="text-sm text-slate-300">Today&apos;s discovery match</p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex size-16 items-center justify-center rounded-[22px] bg-white/12 text-lg font-semibold">
                      KM
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold">Kavya, 28</h2>
                      <p className="text-sm text-slate-300">Meditation, seva, quiet mornings</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3 text-sm text-slate-200">
                    <div className="flex items-center justify-between rounded-2xl bg-white/8 px-4 py-3">
                      <span>Shared values</span>
                      <span>92%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white/8 px-4 py-3">
                      <span>Conversation warmth</span>
                      <span>High</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white/8 px-4 py-3">
                      <span>Message requests this week</span>
                      <span>4</span>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </SectionCard>

      <section className="grid gap-6 lg:grid-cols-3">
        {trustPillars.map(({ title, copy, icon: Icon }) => (
          <SectionCard key={title}>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Icon className="size-5" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-slate-950">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{copy}</p>
          </SectionCard>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard>
          <Eyebrow>Journey</Eyebrow>
          <div className="mt-5 space-y-4">
            {[
              "Create a profile that feels human, not performative.",
              "Share spiritual values, practices, and everyday rhythms.",
              "Receive discovery cards designed for clarity and comfort.",
              "Send a message request only when the introduction feels right.",
              "Move into conversation once trust is mutual.",
            ].map((step, index) => (
              <div key={step} className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-900">
                  {index + 1}
                </span>
                <p className="text-sm leading-7 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] bg-amber-50 p-5">
            <Sparkles className="size-5 text-amber-700" />
            <h3 className="mt-6 text-2xl font-semibold text-slate-950">Beautiful by default</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Soft neutrals, warm light, generous spacing, and clean typography create a premium feeling without becoming flashy.
            </p>
          </div>
          <div className="rounded-[24px] bg-slate-900 p-5 text-white">
            <MessageCircleMore className="size-5 text-slate-300" />
            <h3 className="mt-6 text-2xl font-semibold">Built for the backend</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              The UI mirrors your backend model: onboarding, discovery, message requests, conversation threads, and account trust settings.
            </p>
          </div>
        </SectionCard>
      </section>
    </main>
  );
}
