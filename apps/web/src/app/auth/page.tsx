"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, HeartHandshake, ShieldCheck } from "lucide-react";

import { Brand } from "@/components/brand";
import { Eyebrow, Pill, PrimaryButton, SectionCard, SecondaryButton } from "@/components/ui";
import { login, register, setStoredToken } from "@/lib/api";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("male");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response =
        mode === "login"
          ? await login({ email, password })
          : await register({
              email,
              password,
              display_name: displayName,
              gender,
            });
      setStoredToken(response.token);
      setMessage(`Signed in as ${response.user.display_name}. Continue to onboarding.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not authenticate");
    } finally {
      setLoading(false);
    }
  }

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
              <p className="text-sm font-semibold text-slate-900">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {mode === "login"
                  ? "Enter gently, continue intentionally."
                  : "Set up your account to start discovery and requests."}
              </p>
            </div>
            <Pill tone="soft">Web v1</Pill>
          </div>

          <div className="mt-8 grid gap-4">
            {mode === "register" ? (
              <>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Display name</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                    placeholder="Aarav"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Gender</span>
                  <select
                    value={gender}
                    onChange={(event) => setGender(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>
              </>
            ) : null}
            <label className="space-y-2 text-sm text-slate-600">
              <span>Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                placeholder="you@example.com"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                placeholder="Enter your password"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryButton onClick={handleSubmit} disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Continue" : "Create account"}
              <ArrowRight className="ml-2 size-4" />
            </PrimaryButton>
            <SecondaryButton onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Create a new account" : "I already have an account"}
            </SecondaryButton>
          </div>

          {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

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
