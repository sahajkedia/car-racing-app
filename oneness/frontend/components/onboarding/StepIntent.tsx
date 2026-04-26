"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { playSound } from "@/lib/sounds";

/* ── Height data ─────────────────────────────────────────── */
function generateFtInHeights() {
  const list: { label: string; cm: number }[] = [];
  for (let ft = 4; ft <= 7; ft++) {
    const maxIn = ft === 7 ? 0 : 11;
    for (let inch = 0; inch <= maxIn; inch++) {
      const cm = Math.round(ft * 30.48 + inch * 2.54);
      list.push({ label: `${ft}'${inch}"`, cm });
    }
  }
  return list;
}
function generateCmHeights() {
  const list: { label: string; cm: number }[] = [];
  for (let cm = 140; cm <= 213; cm++) list.push({ label: `${cm} cm`, cm });
  return list;
}
const FT_IN_HEIGHTS = generateFtInHeights();
const CM_HEIGHTS = generateCmHeights();

/* ── Drum Picker ─────────────────────────────────────────── */
const ITEM_H = 56;
const VISIBLE = 5;

function DrumPicker({ items, selectedCm, onChange }: { items: { label: string; cm: number }[]; selectedCm: number; onChange: (cm: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollToIdx = useCallback((idx: number, smooth = true) => {
    if (!ref.current) return;
    ref.current.scrollTo({ top: idx * ITEM_H, behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => {
    const idx = items.findIndex(it => it.cm === selectedCm);
    scrollToIdx(idx >= 0 ? idx : 0, false);
  }, [items, selectedCm, scrollToIdx]);

  function handleScroll() {
    if (!ref.current) return;
    const idx = Math.round(ref.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    if (items[clamped] && items[clamped].cm !== selectedCm) onChange(items[clamped].cm);
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      if (!ref.current) return;
      const finalIdx = Math.round(ref.current.scrollTop / ITEM_H);
      scrollToIdx(Math.max(0, Math.min(finalIdx, items.length - 1)));
    }, 150);
  }

  const pad = ITEM_H * 2;
  const selectedIdx = items.findIndex(it => it.cm === selectedCm);

  return (
    <div className="relative select-none" style={{ height: ITEM_H * VISIBLE }}>
      <div className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{ height: pad, background: "linear-gradient(to bottom, var(--background) 40%, transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{ height: pad, background: "linear-gradient(to top, var(--background) 40%, transparent)" }} />
      <div className="absolute inset-x-0 z-0 rounded-2xl mx-2"
        style={{ top: pad, height: ITEM_H, background: "var(--card-selected)" }} />
      <div ref={ref} className="drum-picker absolute inset-0 overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory" }} onScroll={handleScroll}>
        <div style={{ height: pad }} />
        {items.map((item, i) => (
          <div key={item.cm} style={{ height: ITEM_H, scrollSnapAlign: "center" }}
            className="flex items-center justify-center cursor-pointer"
            onClick={() => { onChange(item.cm); scrollToIdx(i); }}>
            <span className="text-lg transition-all" style={{
              fontWeight: i === selectedIdx ? 700 : 400,
              color: i === selectedIdx ? "var(--foreground)" : "var(--muted)",
              fontSize: i === selectedIdx ? "1.25rem" : "1rem",
            }}>{item.label}</span>
          </div>
        ))}
        <div style={{ height: pad }} />
      </div>
    </div>
  );
}

/* ── Dual Range Slider ───────────────────────────────────── */
function DualRangeSlider({ min, max, minVal, maxVal, onChange }: {
  min: number; max: number; minVal: number; maxVal: number; onChange: (min: number, max: number) => void;
}) {
  const minPct = ((minVal - min) / (max - min)) * 100;
  const maxPct = ((maxVal - min) / (max - min)) * 100;
  return (
    <div className="py-8 px-2">
      <div className="relative h-10 mb-3">
        <div className="absolute -translate-x-1/2 flex items-center justify-center w-11 h-11 rounded-full text-sm font-medium"
          style={{ left: `${minPct}%`, background: "var(--card-bg)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}>{minVal}</div>
        <div className="absolute -translate-x-1/2 flex items-center justify-center w-11 h-11 rounded-full text-sm font-medium"
          style={{ left: `${maxPct}%`, background: "var(--card-bg)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}>{maxVal}</div>
      </div>
      <div className="relative h-1 rounded-full" style={{ background: "var(--border)" }}>
        <div className="absolute h-full rounded-full"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%`, background: "var(--foreground)" }} />
        <input type="range" min={min} max={max} value={minVal} className="range-thumb" style={{ top: "-12px" }}
          onChange={e => { const v = parseInt(e.target.value); if (v < maxVal) onChange(v, maxVal); }} />
        <input type="range" min={min} max={max} value={maxVal} className="range-thumb" style={{ top: "-12px" }}
          onChange={e => { const v = parseInt(e.target.value); if (v > minVal) onChange(minVal, v); }} />
      </div>
    </div>
  );
}

/* ── Unit Toggle ─────────────────────────────────────────── */
function UnitToggle({ unit, onChange }: { unit: "ft" | "cm"; onChange: (u: "ft" | "cm") => void }) {
  return (
    <div className="flex gap-2 mb-4">
      {(["ft", "cm"] as const).map(u => (
        <button key={u} onClick={() => onChange(u)}
          className="flex-1 py-3 rounded-2xl font-medium text-sm transition-all"
          style={{ background: unit === u ? "var(--card-selected)" : "var(--card-bg)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}>
          {u === "ft" ? "ft / in" : "cm"}
        </button>
      ))}
    </div>
  );
}

/* ── Looking For ─────────────────────────────────────────── */
const LOOKING_FOR = [
  { value: "short_term", label: "I'm still figuring it out" },
  { value: "long_term", label: "Long term relationship" },
  { value: "date_to_marry", label: "Dating to marry" },
  { value: "date_to_marry_soon", label: "Dating to marry, soon" },
];

const STEP_TITLES = [
  "What are you looking for?",
  "How tall are you?",
  "How short is too short?",
  "What's your age preference?",
];

/* ── Main Component ──────────────────────────────────────── */
interface Props { onComplete: () => void; }

export default function StepIntent({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [animKey, setAnimKey] = useState(0);

  const [lookingFor, setLookingFor] = useState("");
  const [unit, setUnit] = useState<"ft" | "cm">("ft");
  const [heightCm, setHeightCm] = useState(170);
  const [minHeightCm, setMinHeightCm] = useState(152);
  const [ageMin, setAgeMin] = useState(21);
  const [ageMax, setAgeMax] = useState(32);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const heightItems = unit === "ft" ? FT_IN_HEIGHTS : CM_HEIGHTS;

  function advance() { setError(""); setDir(1); setAnimKey(k => k + 1); setStep(s => s + 1); }
  function retreat() { setError(""); setDir(-1); setAnimKey(k => k + 1); setStep(s => s - 1); }

  function handleNext() {
    playSound("tap");
    if (step === 0 && !lookingFor) { setError("Please select what you're looking for"); return; }
    if (step < STEP_TITLES.length - 1) { advance(); }
    else { handleSubmit(); }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await api.saveIntent({
        looking_for: lookingFor,
        height_cm: heightCm,
        min_height_cm: minHeightCm,
        max_height_cm: 0,
        min_age: ageMin,
        max_age: ageMax,
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
          <p className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            {STEP_TITLES[step]}
          </p>

          {step === 0 && (
            <div className="space-y-2.5">
              {LOOKING_FOR.map(opt => (
                <button key={opt.value} onClick={() => { playSound("tap"); setLookingFor(opt.value); }}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all"
                  style={{ background: lookingFor === opt.value ? "var(--card-selected)" : "var(--card-bg)", border: "1.5px solid var(--border)" }}>
                  <span className="font-medium text-base"
                    style={{ color: lookingFor === opt.value ? "var(--foreground)" : "var(--muted)" }}>
                    {opt.label}
                  </span>
                  {lookingFor === opt.value && (
                    <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--foreground)" }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <>
              <UnitToggle unit={unit} onChange={setUnit} />
              <DrumPicker items={heightItems} selectedCm={heightCm} onChange={setHeightCm} />
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>for someone you'd date</p>
              <UnitToggle unit={unit} onChange={setUnit} />
              <DrumPicker items={heightItems} selectedCm={minHeightCm} onChange={setMinHeightCm} />
            </>
          )}

          {step === 3 && (
            <DualRangeSlider min={18} max={60} minVal={ageMin} maxVal={ageMax}
              onChange={(mn, mx) => { setAgeMin(mn); setAgeMax(mx); }} />
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
