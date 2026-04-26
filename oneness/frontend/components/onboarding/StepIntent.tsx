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
  for (let cm = 140; cm <= 213; cm++) {
    list.push({ label: `${cm} cm`, cm });
  }
  return list;
}

const FT_IN_HEIGHTS = generateFtInHeights();
const CM_HEIGHTS = generateCmHeights();

/* ── Drum Picker ─────────────────────────────────────────── */
const ITEM_H = 56;
const VISIBLE = 5;

interface DrumPickerProps {
  items: { label: string; cm: number }[];
  selectedCm: number;
  onChange: (cm: number) => void;
}

function DrumPicker({ items, selectedCm, onChange }: DrumPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToIdx = useCallback((idx: number, smooth = true) => {
    if (!ref.current) return;
    ref.current.scrollTo({ top: idx * ITEM_H, behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => {
    const idx = items.findIndex((it) => it.cm === selectedCm);
    scrollToIdx(idx >= 0 ? idx : 0, false);
  }, [items, selectedCm, scrollToIdx]);

  function handleScroll() {
    if (!ref.current) return;
    const idx = Math.round(ref.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    if (items[clamped] && items[clamped].cm !== selectedCm) {
      onChange(items[clamped].cm);
    }
    // Snap to nearest after scroll stops
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      if (!ref.current) return;
      const finalIdx = Math.round(ref.current.scrollTop / ITEM_H);
      scrollToIdx(Math.max(0, Math.min(finalIdx, items.length - 1)));
    }, 150);
  }

  const containerH = ITEM_H * VISIBLE;
  const pad = ITEM_H * 2;
  const selectedIdx = items.findIndex((it) => it.cm === selectedCm);

  return (
    <div className="relative select-none" style={{ height: containerH }}>
      {/* Fade overlays */}
      <div
        className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{
          height: pad,
          background: "linear-gradient(to bottom, var(--background) 40%, transparent)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{
          height: pad,
          background: "linear-gradient(to top, var(--background) 40%, transparent)",
        }}
      />

      {/* Selected highlight */}
      <div
        className="absolute inset-x-0 z-0 rounded-2xl mx-2"
        style={{
          top: pad,
          height: ITEM_H,
          background: "var(--card-selected)",
        }}
      />

      {/* Scroll container */}
      <div
        ref={ref}
        className="drum-picker absolute inset-0 overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory" }}
        onScroll={handleScroll}
      >
        {/* Top padding */}
        <div style={{ height: pad }} />
        {items.map((item, i) => (
          <div
            key={item.cm}
            style={{ height: ITEM_H, scrollSnapAlign: "center" }}
            className="flex items-center justify-center cursor-pointer"
            onClick={() => { onChange(item.cm); scrollToIdx(i); }}
          >
            <span
              className="text-lg transition-all"
              style={{
                fontWeight: i === selectedIdx ? 700 : 400,
                color: i === selectedIdx ? "var(--foreground)" : "var(--muted)",
                fontSize: i === selectedIdx ? "1.25rem" : "1rem",
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
        {/* Bottom padding */}
        <div style={{ height: pad }} />
      </div>
    </div>
  );
}

/* ── Dual Range Slider ───────────────────────────────────── */
interface DualRangeSliderProps {
  min: number;
  max: number;
  minVal: number;
  maxVal: number;
  onChange: (min: number, max: number) => void;
}

function DualRangeSlider({ min, max, minVal, maxVal, onChange }: DualRangeSliderProps) {
  const minPct = ((minVal - min) / (max - min)) * 100;
  const maxPct = ((maxVal - min) / (max - min)) * 100;

  return (
    <div className="py-8 px-2">
      {/* Value bubbles */}
      <div className="relative h-10 mb-3">
        <div
          className="absolute -translate-x-1/2 flex items-center justify-center w-11 h-11 rounded-full text-sm font-medium"
          style={{ left: `${minPct}%`, background: "var(--card-bg)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
        >
          {minVal}
        </div>
        <div
          className="absolute -translate-x-1/2 flex items-center justify-center w-11 h-11 rounded-full text-sm font-medium"
          style={{ left: `${maxPct}%`, background: "var(--card-bg)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
        >
          {maxVal}
        </div>
      </div>

      {/* Track */}
      <div className="relative h-1 rounded-full" style={{ background: "var(--border)" }}>
        {/* Filled range */}
        <div
          className="absolute h-full rounded-full"
          style={{
            left: `${minPct}%`,
            right: `${100 - maxPct}%`,
            background: "var(--foreground)",
          }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={minVal}
          className="range-thumb"
          style={{ top: "-12px" }}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (v < maxVal) onChange(v, maxVal);
          }}
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={maxVal}
          className="range-thumb"
          style={{ top: "-12px" }}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (v > minVal) onChange(minVal, v);
          }}
        />
      </div>
    </div>
  );
}

/* ── Section Heading ─────────────────────────────────────── */
function SectionHeading({ before, italic, after, sub }: {
  before: string; italic: string; after?: string; sub?: string;
}) {
  return (
    <div className="mt-8 mb-4">
      <h2
        className="text-3xl leading-snug"
        style={{ fontFamily: "var(--font-playfair)", color: "var(--foreground)" }}
      >
        {before}<em>{italic}</em>{after ?? ""}
      </h2>
      {sub && (
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{sub}</p>
      )}
    </div>
  );
}

/* ── Looking For Options ─────────────────────────────────── */
const LOOKING_FOR = [
  { value: "short_term", label: "I'm still figuring it out" },
  { value: "long_term", label: "Long term relationship" },
  { value: "date_to_marry", label: "Dating to marry" },
  { value: "date_to_marry_soon", label: "Dating to marry, soon" },
];

/* ── Main Component ──────────────────────────────────────── */
interface Props { onComplete: () => void; }

export default function StepIntent({ onComplete }: Props) {
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [unit, setUnit] = useState<"ft" | "cm">("ft");
  const [heightCm, setHeightCm] = useState(175);
  const [minHeightCm, setMinHeightCm] = useState(152);
  const [ageMin, setAgeMin] = useState(21);
  const [ageMax, setAgeMax] = useState(32);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const heightItems = unit === "ft" ? FT_IN_HEIGHTS : CM_HEIGHTS;
  const minHeightItems = unit === "ft" ? FT_IN_HEIGHTS : CM_HEIGHTS;

  function toggleLookingFor(val: string) {
    playSound("tap");
    setLookingFor((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  }

  async function handleSubmit() {
    playSound("tap");
    setError("");
    if (lookingFor.length === 0) {
      setError("Please select what you're looking for");
      return;
    }
    setLoading(true);
    try {
      await api.saveIntent({
        looking_for: lookingFor[0],
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

  return (
    <div className="space-y-2 mt-2">
      {/* ── Looking For ── */}
      <div className="space-y-2.5">
        {LOOKING_FOR.map((opt) => {
          const selected = lookingFor.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggleLookingFor(opt.value)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all"
              style={{
                background: selected ? "var(--card-selected)" : "var(--card-bg)",
                border: "1.5px solid var(--border)",
              }}
            >
              <span
                className="font-medium text-base"
                style={{ color: selected ? "var(--foreground)" : "var(--muted)" }}
              >
                {opt.label}
              </span>
              {selected && (
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--foreground)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Your Height ── */}
      <SectionHeading before="How " italic="tall" after=" are you?" sub="Please don't lie." />

      {/* Unit toggle */}
      <div className="flex gap-2 mb-4">
        {(["ft", "cm"] as const).map((u) => (
          <button
            key={u}
            onClick={() => setUnit(u)}
            className="flex-1 py-3 rounded-2xl font-medium text-sm transition-all"
            style={{
              background: unit === u ? "var(--card-selected)" : "var(--card-bg)",
              border: "1.5px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            {u === "ft" ? "ft / in" : "cm"}
          </button>
        ))}
      </div>

      <DrumPicker
        items={heightItems}
        selectedCm={heightCm}
        onChange={setHeightCm}
      />

      {/* ── Min Height Preference ── */}
      <SectionHeading before="how " italic="short" after=" is too short?" sub="for someone you'd date" />

      <div className="flex gap-2 mb-4">
        {(["ft", "cm"] as const).map((u) => (
          <button
            key={u}
            onClick={() => setUnit(u)}
            className="flex-1 py-3 rounded-2xl font-medium text-sm transition-all"
            style={{
              background: unit === u ? "var(--card-selected)" : "var(--card-bg)",
              border: "1.5px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            {u === "ft" ? "ft / in" : "cm"}
          </button>
        ))}
      </div>

      <DrumPicker
        items={minHeightItems}
        selectedCm={minHeightCm}
        onChange={setMinHeightCm}
      />

      {/* ── Age Preference ── */}
      <SectionHeading before="What is your " italic="age" after=" preference?" />

      <DualRangeSlider
        min={18}
        max={60}
        minVal={ageMin}
        maxVal={ageMax}
        onChange={(mn, mx) => { setAgeMin(mn); setAgeMax(mx); }}
      />

      {error && <p className="text-sm pt-2" style={{ color: "#E05353" }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full font-medium py-3.5 rounded-2xl transition-all disabled:opacity-40 mt-4"
        style={{ background: "var(--foreground)", color: "var(--background)" }}
      >
        {loading ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
