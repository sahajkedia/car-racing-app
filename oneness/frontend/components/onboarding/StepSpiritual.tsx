"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { playSound } from "@/lib/sounds";

const IE_OPTIONS = [
  { value: "completed_shambhavi", label: "Completed Shambhavi Mahamudra" },
  { value: "completed_ie", label: "Completed Inner Engineering" },
  { value: "in_progress", label: "Currently doing Inner Engineering" },
  { value: "not_done", label: "Not yet — I practise other meditation" },
];

const PRACTICES = [
  { value: "shambhavi_mahamudra", label: "Shambhavi Mahamudra" },
  { value: "surya_kriya", label: "Surya Kriya" },
  { value: "hatha_yoga", label: "Hatha Yoga (Isha)" },
  { value: "bhuta_shuddhi", label: "Bhuta Shuddhi" },
  { value: "isha_kriya", label: "Isha Kriya" },
  { value: "yogasanas", label: "Yogasanas" },
  { value: "chanting", label: "Chanting / Nada" },
  { value: "general_meditation", label: "Other meditation" },
];

const DIET = [
  { value: "sattvic", label: "Sattvic", sub: "No onion/garlic" },
  { value: "vegan", label: "Vegan", sub: "" },
  { value: "vegetarian", label: "Vegetarian", sub: "" },
  { value: "occasionally_non_veg", label: "Occasionally non-veg", sub: "" },
  { value: "non_veg", label: "Non-vegetarian", sub: "" },
];

const COMMITMENT = [
  { value: "deeply_committed", label: "Deeply committed", sub: "Daily sadhana, retreats" },
  { value: "regular", label: "Regular practitioner", sub: "Consistent practice" },
  { value: "casual", label: "Casually exploring", sub: "Curious, sometimes" },
];

interface Props { onComplete: () => void; }

export default function StepSpiritual({ onComplete }: Props) {
  const [ieStatus, setIeStatus] = useState("");
  const [practices, setPractices] = useState<string[]>([]);
  const [diet, setDiet] = useState("");
  const [commitment, setCommitment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function togglePractice(val: string) {
    playSound("tap");
    setPractices((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]
    );
  }

  async function handleSubmit() {
    playSound("tap");
    setError("");
    if (!ieStatus || !diet || !commitment) {
      setError("Please complete all fields");
      return;
    }
    setLoading(true);
    try {
      await api.saveSpiritual({
        ie_status: ieStatus,
        daily_practices: practices,
        diet,
        commitment_level: commitment,
      });
      playSound("success");
      onComplete();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 mt-4">
      <Section label="Your Isha journey">
        <div className="space-y-2">
          {IE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { playSound("tap"); setIeStatus(opt.value); }}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                ieStatus === opt.value
                  ? "bg-amber-400/10 border-amber-400 text-white"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Daily practices (select all that apply)">
        <div className="flex flex-wrap gap-2">
          {PRACTICES.map((p) => (
            <button
              key={p.value}
              onClick={() => togglePractice(p.value)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                practices.includes(p.value)
                  ? "bg-amber-400/10 border-amber-400 text-amber-300"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Diet">
        <div className="space-y-2">
          {DIET.map((d) => (
            <button
              key={d.value}
              onClick={() => { playSound("tap"); setDiet(d.value); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all ${
                diet === d.value
                  ? "bg-amber-400/10 border-amber-400 text-white"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              <span>{d.label}</span>
              {d.sub && <span className="text-xs text-zinc-500">{d.sub}</span>}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Relationship with your practice">
        <div className="space-y-2">
          {COMMITMENT.map((c) => (
            <button
              key={c.value}
              onClick={() => { playSound("tap"); setCommitment(c.value); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                commitment === c.value
                  ? "bg-amber-400/10 border-amber-400 text-white"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              <span className="font-medium">{c.label}</span>
              <span className="text-xs text-zinc-500">{c.sub}</span>
            </button>
          ))}
        </div>
      </Section>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-amber-400 text-black font-medium py-3 rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-40"
      >
        {loading ? "Almost there…" : "Enter Oneness →"}
      </button>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-zinc-400 text-sm">{label}</p>
      {children}
    </div>
  );
}
