"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { playSound } from "@/lib/sounds";

const GENDERS = [
  { value: "male", label: "Man" },
  { value: "female", label: "Woman" },
  { value: "non_binary", label: "Non-binary" },
];

const fieldStyle = {
  background: "var(--card-bg)",
  border: "1.5px solid var(--input-border)",
  color: "var(--foreground)",
};

interface Props { onComplete: () => void; }

export default function StepBasics({ onComplete }: Props) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [interestedIn, setInterestedIn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    playSound("tap");
    setError("");
    if (!name || !dob || !gender || !interestedIn) {
      setError("All fields are required");
      return;
    }
    setLoading(true);
    try {
      await api.saveBasics({ name, dob, gender, interested_in_gender: interestedIn });
      onComplete();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 mt-4">
      <Field label="Your name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name"
          className="w-full rounded-2xl px-4 py-3.5 text-base outline-none"
          style={fieldStyle}
        />
      </Field>

      <Field label="Date of birth">
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className="w-full rounded-2xl px-4 py-3.5 text-base outline-none"
          style={fieldStyle}
        />
      </Field>

      <Field label="I am a">
        <div className="flex gap-2">
          {GENDERS.map((g) => (
            <PillBtn
              key={g.value}
              selected={gender === g.value}
              onClick={() => { playSound("tap"); setGender(g.value); }}
            >
              {g.label}
            </PillBtn>
          ))}
        </div>
      </Field>

      <Field label="Looking to meet">
        <div className="flex gap-2">
          {GENDERS.map((g) => (
            <PillBtn
              key={g.value}
              selected={interestedIn === g.value}
              onClick={() => { playSound("tap"); setInterestedIn(g.value); }}
            >
              {g.label}
            </PillBtn>
          ))}
        </div>
      </Field>

      {error && <p className="text-sm" style={{ color: "#E05353" }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full font-medium py-3.5 rounded-2xl transition-all disabled:opacity-40 mt-2"
        style={{ background: "var(--foreground)", color: "var(--background)" }}
      >
        {loading ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>{label}</label>
      {children}
    </div>
  );
}

function PillBtn({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all"
      style={{
        background: selected ? "var(--card-selected)" : "var(--card-bg)",
        border: "1.5px solid var(--border)",
        color: "var(--foreground)",
      }}
    >
      {children}
    </button>
  );
}
