"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { playSound } from "@/lib/sounds";

const LOOKING_FOR = [
  { value: "date_to_marry_soon", label: "Ready to marry", sub: "Serious, soon" },
  { value: "date_to_marry", label: "Dating to marry", sub: "Finding the one" },
  { value: "long_term", label: "Long-term relationship", sub: "Committed connection" },
  { value: "short_term", label: "Open to explore", sub: "No pressure" },
];

interface Props { onComplete: () => void; }

export default function StepIntent({ onComplete }: Props) {
  const [lookingFor, setLookingFor] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [minHeight, setMinHeight] = useState("");
  const [maxHeight, setMaxHeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    playSound("tap");
    setError("");
    if (!lookingFor || !heightCm) {
      setError("Looking for and your height are required");
      return;
    }
    const h = parseInt(heightCm);
    if (isNaN(h) || h < 100 || h > 250) {
      setError("Enter a valid height in cm (100–250)");
      return;
    }
    setLoading(true);
    try {
      await api.saveIntent({
        looking_for: lookingFor,
        height_cm: h,
        min_height_cm: minHeight ? parseInt(minHeight) : 0,
        max_height_cm: maxHeight ? parseInt(maxHeight) : 0,
      });
      onComplete();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400 transition-colors";

  return (
    <div className="space-y-5 mt-4">
      <div className="space-y-2">
        <label className="text-zinc-400 text-sm">What are you looking for?</label>
        {LOOKING_FOR.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { playSound("tap"); setLookingFor(opt.value); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
              lookingFor === opt.value
                ? "bg-amber-400/10 border-amber-400 text-white"
                : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            <span className="font-medium text-sm">{opt.label}</span>
            <span className="text-xs text-zinc-500">{opt.sub}</span>
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <label className="text-zinc-400 text-sm">Your height (cm)</label>
        <input
          type="number"
          value={heightCm}
          onChange={(e) => setHeightCm(e.target.value)}
          placeholder="175"
          className={inputCls}
        />
      </div>

      <div className="space-y-2">
        <label className="text-zinc-400 text-sm">Height preference (optional)</label>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <p className="text-zinc-600 text-xs">Minimum (cm)</p>
            <input
              type="number"
              value={minHeight}
              onChange={(e) => setMinHeight(e.target.value)}
              placeholder="160"
              className={inputCls}
            />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-zinc-600 text-xs">Maximum (cm)</p>
            <input
              type="number"
              value={maxHeight}
              onChange={(e) => setMaxHeight(e.target.value)}
              placeholder="190"
              className={inputCls}
            />
          </div>
        </div>
        <p className="text-zinc-600 text-xs">Leave blank to match any height</p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-amber-400 text-black font-medium py-3 rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-40"
      >
        {loading ? "Saving…" : "Continue →"}
      </button>
    </div>
  );
}
