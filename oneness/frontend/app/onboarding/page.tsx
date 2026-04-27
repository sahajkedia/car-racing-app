"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { playSound } from "@/lib/sounds";

import StepPhotos from "@/components/onboarding/StepPhotos";
import StepBasics from "@/components/onboarding/StepBasics";
import StepLocation from "@/components/onboarding/StepLocation";
import StepIntent from "@/components/onboarding/StepIntent";
import StepAbout from "@/components/onboarding/StepAbout";
const STEPS = ["basics", "location", "intent", "about", "photos"] as const;
type Step = (typeof STEPS)[number];

const STEP_HEADINGS: Record<Step, { before: string; italic: string; after?: string; sub?: string }> = {
  basics:   { before: "Tell us about ", italic: "yourself", sub: "" },
  location: { before: "Where are you ", italic: "based?",   sub: "Don't worry, your exact location will not be shared." },
  intent:   { before: "What are you ",  italic: "looking",  after: " for?", sub: "We know you are tired of answering this." },
  about:    { before: "Your ",          italic: "story",    sub: "Your passions, what lights you up." },
  photos:   { before: "Your ",          italic: "moodboard", sub: "Make them count." },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("basics");
  const [animKey, setAnimKey] = useState(0);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const heading = STEP_HEADINGS[step];

  function advance(nextStep?: Step) {
    playSound("success");
    if (nextStep) {
      setAnimKey(k => k + 1);
      setStep(nextStep);
    } else {
      router.push("/sangha");
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Thin progress bar */}
      <div className="h-0.5 w-full" style={{ background: "var(--border)" }}>
        <div className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, background: "var(--foreground)" }} />
      </div>

      {/* Step counter */}
      <div className="px-6 pt-6">
        <p className="text-xs tracking-widest uppercase" style={{ color: "var(--muted)" }}>
          {stepIndex + 1} of {STEPS.length}
        </p>
      </div>

      {/* Heading — slides with each step */}
      <div key={`heading-${animKey}`} className="px-6 pt-3 pb-2 slide-from-right">
        <h1 className="text-4xl leading-tight"
          style={{ fontFamily: "var(--font-playfair)", color: "var(--foreground)" }}>
          {heading.before}<em>{heading.italic}</em>{heading.after ?? ""}
        </h1>
        {heading.sub && (
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            {heading.sub}
          </p>
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 pb-10 overflow-y-auto">
        {step === "basics"   && <StepBasics   onComplete={() => advance("location")} />}
        {step === "location" && <StepLocation onComplete={() => advance("intent")} />}
        {step === "intent"   && <StepIntent   onComplete={() => advance("about")} />}
        {step === "about"    && <StepAbout    onComplete={() => advance("photos")} />}
        {step === "photos"   && <StepPhotos   onComplete={() => advance()} />}
      </div>
    </div>
  );
}
