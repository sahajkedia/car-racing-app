"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { playSound } from "@/lib/sounds";

// Step components imported inline for simplicity
import StepPhotos from "@/components/onboarding/StepPhotos";
import StepBasics from "@/components/onboarding/StepBasics";
import StepLocation from "@/components/onboarding/StepLocation";
import StepIntent from "@/components/onboarding/StepIntent";
import StepAbout from "@/components/onboarding/StepAbout";
import StepSpiritual from "@/components/onboarding/StepSpiritual";

const STEPS = ["photos", "basics", "location", "intent", "about", "spiritual"] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS: Record<Step, string> = {
  photos: "Your Moodboard",
  basics: "About You",
  location: "Where You Are",
  intent: "What You Seek",
  about: "Your Story",
  spiritual: "Your Practice",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("photos");
  const [profileId, setProfileId] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex) / STEPS.length) * 100;

  function advance(nextStep?: Step) {
    playSound("success");
    if (nextStep) {
      setStep(nextStep);
    } else {
      router.push("/sangha");
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <p className="text-amber-300 text-xs tracking-widest uppercase mb-1">
          {stepIndex + 1} of {STEPS.length}
        </p>
        <h2 className="text-white text-xl font-light">{STEP_LABELS[step]}</h2>
        {/* Progress bar */}
        <div className="mt-3 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 pb-8 overflow-y-auto">
        {step === "photos" && (
          <StepPhotos
            onComplete={(pid) => { setProfileId(pid); advance("basics"); }}
          />
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
