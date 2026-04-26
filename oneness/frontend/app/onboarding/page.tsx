"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { playSound } from "@/lib/sounds";

import StepPhotos from "@/components/onboarding/StepPhotos";
import StepBasics from "@/components/onboarding/StepBasics";
import StepLocation from "@/components/onboarding/StepLocation";
import StepIntent from "@/components/onboarding/StepIntent";
import StepAbout from "@/components/onboarding/StepAbout";
import StepSpiritual from "@/components/onboarding/StepSpiritual";

const STEPS = ["photos", "basics", "location", "intent", "about", "spiritual"] as const;
type Step = (typeof STEPS)[number];

const STEP_HEADINGS: Record<Step, { before: string; italic: string; after?: string; sub?: string }> = {
  photos: { before: "Your ", italic: "moodboard", sub: "Make them count." },
  basics: { before: "Tell us about ", italic: "yourself", sub: "" },
  location: { before: "Where are you ", italic: "based?", sub: "Don't worry, your exact location will not be shared." },
  intent: { before: "What are you ", italic: "looking", after: " for?", sub: "We know you are tired of answering this." },
  about: { before: "Your ", italic: "story", sub: "Career, passions, what lights you up." },
  spiritual: { before: "Your ", italic: "practice", sub: "How you walk the inner path." },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("photos");

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const heading = STEP_HEADINGS[step];

  function advance(nextStep?: Step) {
    playSound("success");
    if (nextStep) {
      setStep(nextStep);
    } else {
      router.push("/sangha");
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Thin progress bar at very top */}
      <div className="h-0.5 w-full" style={{ background: "var(--border)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, background: "var(--foreground)" }}
        />
      </div>

      {/* Step counter */}
      <div className="px-6 pt-6">
        <p className="text-xs tracking-widest uppercase" style={{ color: "var(--muted)" }}>
          {stepIndex + 1} of {STEPS.length}
        </p>
      </div>

      {/* Heading */}
      <div className="px-6 pt-3 pb-2">
        <h1
          className="text-4xl leading-tight"
          style={{ fontFamily: "var(--font-playfair)", color: "var(--foreground)" }}
        >
          {heading.before}
          <em>{heading.italic}</em>
          {heading.after ?? ""}
        </h1>
        {heading.sub && (
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            {heading.sub}
          </p>
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 pb-10 overflow-y-auto">
        {step === "photos" && (
          <StepPhotos onComplete={(pid) => { void pid; advance("basics"); }} />
        )}
        {step === "basics" && (
          <StepBasics onComplete={() => advance("location")} />
        )}
        {step === "location" && (
          <StepLocation onComplete={() => advance("intent")} />
        )}
        {step === "intent" && (
          <StepIntent onComplete={() => advance("about")} />
        )}
        {step === "about" && (
          <StepAbout onComplete={() => advance("spiritual")} />
        )}
        {step === "spiritual" && (
          <StepSpiritual onComplete={() => advance()} />
        )}
      </div>
    </div>
  );
}
