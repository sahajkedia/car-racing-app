"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { playSound } from "@/lib/sounds";

const SALARY_BRACKETS = ["<5L", "5-10L", "10-20L", "20-40L", "40-80L", "80L+"];

interface Props { onComplete: () => void; }

export default function StepAbout({ onComplete }: Props) {
  const [aboutMe, setAboutMe] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [degree, setDegree] = useState("");
  const [salary, setSalary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    playSound("tap");
    setError("");
    if (!aboutMe.trim()) {
      setError("About me is required");
      return;
    }
    setLoading(true);
    try {
      await api.saveAbout({
        about_me: aboutMe.trim(),
        job_title: jobTitle || undefined,
        degree: degree || undefined,
        salary_bracket: salary || undefined,
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
      <div className="space-y-1.5">
        <label className="text-zinc-400 text-sm flex justify-between">
          <span>About me</span>
          <span className={aboutMe.length > 280 ? "text-amber-400" : "text-zinc-600"}>
            {aboutMe.length}/300
          </span>
        </label>
        <textarea
          value={aboutMe}
          onChange={(e) => setAboutMe(e.target.value.slice(0, 300))}
          placeholder="What makes you, you? Your path, your passions, what lights you up…"
          rows={4}
          className={`${inputCls} resize-none`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-zinc-400 text-sm">Job title</label>
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Software engineer, doctor, teacher…"
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-zinc-400 text-sm">Highest degree</label>
        <input
          type="text"
          value={degree}
          onChange={(e) => setDegree(e.target.value)}
          placeholder="B.Tech, MBA, MBBS…"
          className={inputCls}
        />
      </div>

      <div className="space-y-2">
        <label className="text-zinc-400 text-sm">Annual income (optional)</label>
        <div className="grid grid-cols-3 gap-2">
          {SALARY_BRACKETS.map((b) => (
            <button
              key={b}
              onClick={() => { playSound("tap"); setSalary(b === salary ? "" : b); }}
              className={`py-2 rounded-xl text-sm border transition-all ${
                salary === b
                  ? "bg-amber-400/10 border-amber-400 text-amber-300"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
        <p className="text-zinc-600 text-xs">Never shown publicly. Used only for compatibility matching.</p>
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
