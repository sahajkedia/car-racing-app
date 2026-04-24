"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { playSound } from "@/lib/sounds";

const GENDERS = [
  { value: "male", label: "Man" },
  { value: "female", label: "Woman" },
  { value: "non_binary", label: "Non-binary" },
];

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
          className={inputCls}
        />
      </Field>

      <Field label="Date of birth">
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className={inputCls}
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

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-amber-400 text-black font-medium py-3 rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-40 mt-2"
      >
        {loading ? "Saving…" : "Continue →"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-zinc-400 text-sm">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400 transition-colors";

function PillBtn({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
        selected
          ? "bg-amber-400 text-black border-amber-400"
          : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500"
      }`}
    >
      {children}
    </button>
  );
}
