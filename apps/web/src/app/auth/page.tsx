import Link from "next/link";
import { ArrowRight, HeartHandshake, ShieldCheck } from "lucide-react";

import { Brand } from "@/components/brand";
import { Eyebrow, Pill, PrimaryButton, SectionCard, SecondaryButton } from "@/components/ui";

export default function AuthPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[1280px] items-center px-4 py-8 lg:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard className="bg-[linear-gradient(180deg,#0f172a,#1e293b)] text-white">
          <Brand />
          <Eyebrow>Feel safe from the first step</Eyebrow>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">
            Create an account that invites thoughtful introductions.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
            The onboarding is designed to feel calm and respectful. No chaotic flows, no noisy forms, just the right information to help people meet with confidence.
          </p>
          <div className="mt-8 space-y-4">
            {[
              { icon: ShieldCheck, text: "Request-based messaging helps people keep control." },
              { icon: HeartHandshake, text: "Profiles prioritize intent, values, and trust." },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 text-sm text-slate-200">
                <Icon className="size-4" />
                {text}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Welcome back</p>
              <p className="mt-1 text-sm text-slate-500">Enter gently, continue intentionally.</p>
            </div>
            <Pill tone="soft">Web v1</Pill>
          </div>

          <div className="mt-8 grid gap-4">
            <label className="space-y-2 text-sm text-slate-600">
              <span>Email</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                placeholder="you@example.com"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span>Password</span>
              <input
                type="password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                placeholder="Enter your password"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryButton>
              Continue
              <ArrowRight className="ml-2 size-4" />
            </PrimaryButton>
            <SecondaryButton>Create a new account</SecondaryButton>
          </div>

          <div className="mt-10 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Design note</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              This screen is intentionally quiet: low-contrast surfaces, clear spacing, and a gentle trust message rather than aggressive product marketing.
            </p>
          </div>

          <div className="mt-6 text-sm text-slate-500">
            Continue to <Link className="font-medium text-slate-900" href="/onboarding">onboarding</Link>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
