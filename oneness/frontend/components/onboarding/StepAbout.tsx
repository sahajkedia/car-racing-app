"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { playSound } from "@/lib/sounds";

const fieldStyle = {
  background: "var(--card-bg)",
  border: "1.5px solid var(--input-border)",
  color: "var(--foreground)",
};

const STEP_TITLES = [
  "Tell us about you",
];
const STEP_SUBS = [
  "Your path, passions, what lights you up…",
];

interface Props { onComplete: () => void; }

export default function StepAbout({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [animKey, setAnimKey] = useState(0);

  const [aboutMe, setAboutMe] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function advance() { setError(""); setDir(1); setAnimKey(k => k + 1); setStep(s => s + 1); }
  function retreat() { setError(""); setDir(-1); setAnimKey(k => k + 1); setStep(s => s - 1); }

  function handleNext() {
    playSound("tap");
    if (step === 0 && !aboutMe.trim()) { setError("Please write something about yourself"); return; }
    if (step < STEP_TITLES.length - 1) { advance(); }
    else { handleSubmit(); }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await api.saveAbout({
        about_me: aboutMe.trim(),
      });
      onComplete();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isLast = step === STEP_TITLES.length - 1;

  return (
    <div className="mt-4 space-y-6">
      {/* Progress */}
      <div className="flex gap-1.5 justify-center">
        {STEP_TITLES.map((_, i) => (
          <div key={i} className="h-1 rounded-full transition-all duration-300"
            style={{ width: i === step ? "28px" : "6px", background: i <= step ? "var(--foreground)" : "var(--border)" }} />
        ))}
      </div>

      {/* Sliding content */}
      <div className="overflow-hidden">
        <div key={animKey} className={dir === 1 ? "slide-from-right" : "slide-from-left"}>
          <p className="text-lg font-semibold mb-1" style={{ color: "var(--foreground)" }}>{STEP_TITLES[step]}</p>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>{STEP_SUBS[step]}</p>

          {step === 0 && (
            <div className="relative">
              <textarea
                value={aboutMe}
                onChange={e => setAboutMe(e.target.value.slice(0, 300))}
                placeholder="e.g. I'm an avid meditator who loves trekking and cooking sattvic food…"
                rows={5}
                autoFocus
                className="w-full rounded-2xl px-4 py-3.5 text-base outline-none resize-none"
                style={fieldStyle}
              />
              <span className="absolute bottom-3 right-4 text-xs" style={{ color: "var(--muted)" }}>
                {aboutMe.length}/300
              </span>
            </div>
          )}


        </div>
      </div>

      {error && <p className="text-sm -mt-2" style={{ color: "#E05353" }}>{error}</p>}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={retreat}
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-medium transition-all"
            style={{ background: "var(--card-bg)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}>
            ←
          </button>
        )}
        <button onClick={handleNext} disabled={loading}
          className="flex-1 font-medium py-3.5 rounded-2xl transition-all disabled:opacity-40"
          style={{ background: "var(--foreground)", color: "var(--background)" }}>
          {loading ? "Saving…" : isLast ? "Continue" : "Next"}
        </button>
      </div>
    </div>
  );
}
