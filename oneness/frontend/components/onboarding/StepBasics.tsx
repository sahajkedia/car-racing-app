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

const STEP_TITLES = [
  "What's your name?",
  "When were you born?",
  "I am a…",
  "Looking to meet…",
];

interface Props { onComplete: () => void; }

export default function StepBasics({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [animKey, setAnimKey] = useState(0);

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [interestedIn, setInterestedIn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function advance() {
    setError("");
    setDir(1);
    setAnimKey(k => k + 1);
    setStep(s => s + 1);
  }

  function retreat() {
    setError("");
    setDir(-1);
    setAnimKey(k => k + 1);
    setStep(s => s - 1);
  }

  function handleNext() {
    playSound("tap");
    if (step === 0) {
      if (!name.trim()) { setError("Please enter your name"); return; }
      advance();
    } else if (step === 1) {
      if (!dob) { setError("Please select your date of birth"); return; }
      advance();
    } else if (step === 2) {
      if (!gender) { setError("Please select your gender"); return; }
      advance();
    } else {
      handleSubmit();
    }
  }

  async function handleSubmit() {
    if (!interestedIn) { setError("Please make a selection"); return; }
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

  const isLastStep = step === STEP_TITLES.length - 1;

  return (
    <div className="mt-4 space-y-6">
      {/* Progress bar */}
      <div className="flex gap-1.5 justify-center">
        {STEP_TITLES.map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: i === step ? "28px" : "6px",
              background: i <= step ? "var(--foreground)" : "var(--border)",
            }}
          />
        ))}
      </div>

      {/* Sliding field */}
      <div className="overflow-hidden">
        <div key={animKey} className={dir === 1 ? "slide-from-right" : "slide-from-left"}>
          <p className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            {STEP_TITLES[step]}
          </p>

          {step === 0 && (
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleNext()}
              placeholder="First name"
              autoFocus
              className="w-full rounded-2xl px-4 py-3.5 text-base outline-none"
              style={fieldStyle}
            />
          )}

          {step === 1 && <DOBCalendar value={dob} onChange={setDob} />}

          {step === 2 && (
            <div className="flex gap-2">
              {GENDERS.map(g => (
                <PillBtn
                  key={g.value}
                  selected={gender === g.value}
                  onClick={() => { playSound("tap"); setGender(g.value); }}
                >
                  {g.label}
                </PillBtn>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="flex gap-2">
              {GENDERS.map(g => (
                <PillBtn
                  key={g.value}
                  selected={interestedIn === g.value}
                  onClick={() => { playSound("tap"); setInterestedIn(g.value); }}
                >
                  {g.label}
                </PillBtn>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm -mt-2" style={{ color: "#E05353" }}>{error}</p>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={retreat}
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-medium transition-all"
            style={{ background: "var(--card-bg)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
          >
            ←
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={loading}
          className="flex-1 font-medium py-3.5 rounded-2xl transition-all disabled:opacity-40"
          style={{ background: "var(--foreground)", color: "var(--background)" }}
        >
          {loading ? "Saving…" : isLastStep ? "Continue" : "Next"}
        </button>
      </div>
    </div>
  );
}

// ── DOB Calendar ─────────────────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const WEEK_DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function DOBCalendar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const minDate = new Date(today.getFullYear() - 80, 0, 1);

  const initial = value ? new Date(value + "T00:00:00") : maxDate;
  const [viewing, setViewing] = useState({ month: initial.getMonth(), year: initial.getFullYear() });
  const [open, setOpen] = useState(false);

  const selected = value ? new Date(value + "T00:00:00") : null;

  function prevMonth() {
    setViewing(v => {
      const prev = v.month === 0 ? { month: 11, year: v.year - 1 } : { ...v, month: v.month - 1 };
      return new Date(prev.year, prev.month, 1) >= minDate ? prev : v;
    });
  }
  function nextMonth() {
    setViewing(v => {
      const next = v.month === 11 ? { month: 0, year: v.year + 1 } : { ...v, month: v.month + 1 };
      return new Date(next.year, next.month + 1, 0) <= maxDate ? next : v;
    });
  }
  function prevYear() {
    setViewing(v => v.year - 1 >= minDate.getFullYear() ? { ...v, year: v.year - 1 } : v);
  }
  function nextYear() {
    setViewing(v => v.year + 1 <= maxDate.getFullYear() ? { ...v, year: v.year + 1 } : v);
  }

  function selectDay(day: number) {
    const d = new Date(viewing.year, viewing.month, day);
    if (d > maxDate || d < minDate) return;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    onChange(iso);
    setOpen(false);
    playSound("tap");
  }

  const daysInMonth = new Date(viewing.year, viewing.month + 1, 0).getDate();
  const firstDow = new Date(viewing.year, viewing.month, 1).getDay();

  const canPrevMonth = new Date(viewing.year, viewing.month - 1, 1) >= minDate;
  const canNextMonth = new Date(viewing.year, viewing.month + 1, 0) <= maxDate;
  const canPrevYear = viewing.year - 1 >= minDate.getFullYear();
  const canNextYear = viewing.year + 1 <= maxDate.getFullYear();

  const formatted = selected
    ? selected.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { playSound("tap"); setOpen(o => !o); }}
        className="w-full rounded-2xl px-4 py-3.5 text-base text-left flex items-center justify-between"
        style={{ ...fieldStyle, color: formatted ? "var(--foreground)" : "var(--muted)" }}
      >
        <span>{formatted ?? "Select your birth date"}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ color: "var(--muted)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="mt-2 rounded-2xl overflow-hidden"
          style={{ background: "var(--card-bg)", border: "1.5px solid var(--border)" }}>

          <div className="px-4 pt-4 space-y-2">
            <NavRow onPrev={prevMonth} onNext={nextMonth} canPrev={canPrevMonth} canNext={canNextMonth} label={MONTHS[viewing.month]} />
            <NavRow onPrev={prevYear} onNext={nextYear} canPrev={canPrevYear} canNext={canNextYear} label={String(viewing.year)} />
          </div>

          <div className="mt-3 mx-4" style={{ height: "1px", background: "var(--border)" }} />

          <div className="grid grid-cols-7 text-center px-2 pt-3 pb-1">
            {WEEK_DAYS.map(d => (
              <span key={d} className="text-xs font-medium" style={{ color: "var(--muted)" }}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 px-2 pb-4 gap-y-0.5">
            {Array.from({ length: firstDow }).map((_, i) => <span key={`pad-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const d = new Date(viewing.year, viewing.month, day);
              const isSelected = selected?.toDateString() === d.toDateString();
              const isDisabled = d > maxDate || d < minDate;
              return (
                <button key={day} type="button" onClick={() => selectDay(day)} disabled={isDisabled}
                  className="mx-auto w-9 h-9 rounded-full text-sm flex items-center justify-center transition-all"
                  style={{
                    background: isSelected ? "var(--foreground)" : "transparent",
                    color: isSelected ? "var(--background)" : isDisabled ? "var(--muted)" : "var(--foreground)",
                    fontWeight: isSelected ? 600 : 400,
                    opacity: isDisabled ? 0.2 : 1,
                    cursor: isDisabled ? "default" : "pointer",
                  }}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function NavRow({ onPrev, onNext, canPrev, canNext, label }: {
  onPrev: () => void; onNext: () => void; canPrev: boolean; canNext: boolean; label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <button type="button" onClick={onPrev} disabled={!canPrev}
        className="w-9 h-9 rounded-full flex items-center justify-center text-base font-medium transition-all"
        style={{ background: canPrev ? "var(--card-selected)" : "transparent", color: "var(--foreground)", border: "1.5px solid var(--border)", opacity: canPrev ? 1 : 0.3 }}>
        ‹
      </button>
      <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{label}</span>
      <button type="button" onClick={onNext} disabled={!canNext}
        className="w-9 h-9 rounded-full flex items-center justify-center text-base font-medium transition-all"
        style={{ background: canNext ? "var(--card-selected)" : "transparent", color: "var(--foreground)", border: "1.5px solid var(--border)", opacity: canNext ? 1 : 0.3 }}>
        ›
      </button>
    </div>
  );
}

function PillBtn({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all"
      style={{
        background: selected ? "var(--card-selected)" : "var(--card-bg)",
        border: "1.5px solid var(--border)",
        color: "var(--foreground)",
      }}>
      {children}
    </button>
  );
}
