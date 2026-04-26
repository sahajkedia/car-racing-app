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
            <SelectCard
              key={opt.value}
              selected={ieStatus === opt.value}
              onClick={() => { playSound("tap"); setIeStatus(opt.value); }}
            >
              <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{opt.label}</span>
            </SelectCard>
          ))}
        </div>
      </Section>

      <Section label="Daily practices (select all that apply)">
        <div className="flex flex-wrap gap-2">
          {PRACTICES.map((p) => (
            <button
              key={p.value}
              onClick={() => togglePractice(p.value)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: practices.includes(p.value) ? "var(--card-selected)" : "var(--card-bg)",
                border: "1.5px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Diet">
        <div className="space-y-2">
          {DIET.map((d) => (
            <SelectCard
              key={d.value}
              selected={diet === d.value}
              onClick={() => { playSound("tap"); setDiet(d.value); }}
            >
              <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{d.label}</span>
              {d.sub && <span className="text-xs" style={{ color: "var(--muted)" }}>{d.sub}</span>}
            </SelectCard>
          ))}
        </div>
      </Section>

      <Section label="Relationship with your practice">
        <div className="space-y-2">
          {COMMITMENT.map((c) => (
            <SelectCard
              key={c.value}
              selected={commitment === c.value}
              onClick={() => { playSound("tap"); setCommitment(c.value); }}
            >
              <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{c.label}</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>{c.sub}</span>
            </SelectCard>
          ))}
        </div>
      </Section>

      {error && <p className="text-sm" style={{ color: "#E05353" }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full font-medium py-3.5 rounded-2xl transition-all disabled:opacity-40"
        style={{ background: "var(--foreground)", color: "var(--background)" }}
      >
        {loading ? "Almost there…" : "Enter Oneness"}
      </button>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>{label}</p>
      {children}
    </div>
  );
}

function SelectCard({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all"
      style={{
        background: selected ? "var(--card-selected)" : "var(--card-bg)",
        border: "1.5px solid var(--border)",
      }}
    >
      <div className="flex flex-col">{children}</div>
      {selected && (
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-2"
          style={{ background: "var(--foreground)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
}
