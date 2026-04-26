"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { playSound } from "@/lib/sounds";

const SALARY_BRACKETS = ["<5L", "5-10L", "10-20L", "20-40L", "40-80L", "80L+"];

const fieldStyle = {
  background: "var(--card-bg)",
  border: "1.5px solid var(--input-border)",
  color: "var(--foreground)",
};

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

  return (
    <div className="space-y-5 mt-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex justify-between" style={{ color: "var(--muted)" }}>
          <span>About me</span>
          <span style={{ color: aboutMe.length > 280 ? "var(--foreground)" : "var(--muted)" }}>
            {aboutMe.length}/300
          </span>
        </label>
        <textarea
          value={aboutMe}
          onChange={(e) => setAboutMe(e.target.value.slice(0, 300))}
          placeholder="What makes you, you? Your path, your passions, what lights you up…"
          rows={4}
          className="w-full rounded-2xl px-4 py-3.5 text-base outline-none resize-none"
          style={fieldStyle}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>Job title</label>
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Software engineer, doctor, teacher…"
          className="w-full rounded-2xl px-4 py-3.5 text-base outline-none"
          style={fieldStyle}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>Highest degree</label>
        <input
          type="text"
          value={degree}
          onChange={(e) => setDegree(e.target.value)}
          placeholder="B.Tech, MBA, MBBS…"
          className="w-full rounded-2xl px-4 py-3.5 text-base outline-none"
          style={fieldStyle}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>Annual income (optional)</label>
        <div className="grid grid-cols-3 gap-2">
          {SALARY_BRACKETS.map((b) => (
            <button
              key={b}
              onClick={() => { playSound("tap"); setSalary(b === salary ? "" : b); }}
              className="py-2.5 rounded-2xl text-sm font-medium transition-all"
              style={{
                background: salary === b ? "var(--card-selected)" : "var(--card-bg)",
                border: "1.5px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              {b}
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Never shown publicly. Used only for compatibility matching.
        </p>
      </div>

      {error && <p className="text-sm" style={{ color: "#E05353" }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full font-medium py-3.5 rounded-2xl transition-all disabled:opacity-40"
        style={{ background: "var(--foreground)", color: "var(--background)" }}
      >
        {loading ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
