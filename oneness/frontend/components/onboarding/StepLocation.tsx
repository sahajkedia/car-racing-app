"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { playSound } from "@/lib/sounds";

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
  lat: string;
  lon: string;
}

interface LocationSuggestion {
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
  label: string;
  sublabel: string;
}

interface Props { onComplete: () => void; }

export default function StepLocation({ onComplete }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [selected, setSelected] = useState<LocationSuggestion | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2 || selected) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&featuretype=city`,
          { headers: { "Accept-Language": "en" } }
        );
        const data: NominatimResult[] = await res.json();
        const mapped: LocationSuggestion[] = data
          .filter((r) => r.address.city || r.address.town || r.address.village)
          .map((r) => {
            const city = r.address.city ?? r.address.town ?? r.address.village ?? "";
            const state = r.address.state ?? r.address.county ?? "";
            const country = r.address.country ?? "";
            return {
              city,
              state,
              country,
              lat: parseFloat(r.lat),
              lon: parseFloat(r.lon),
              label: city,
              sublabel: [state, country].filter(Boolean).join(", "),
            };
          });
        setSuggestions(mapped);
        setShowDropdown(mapped.length > 0);
      } catch {
        // silently ignore network errors for autocomplete
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function pickSuggestion(s: LocationSuggestion) {
    playSound("tap");
    setSelected(s);
    setQuery(s.label);
    setShowDropdown(false);
    setSuggestions([]);
  }

  async function handleSubmit() {
    playSound("tap");
    setError("");
    if (!selected) {
      setError("Please select a city from the list");
      return;
    }
    setLoading(true);
    try {
      await api.saveLocation({
        city: selected.city,
        state: selected.state,
        latitude: selected.lat,
        longitude: selected.lon,
      });
      onComplete();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Search input */}
      <div ref={containerRef} className="relative">
        <div
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
          style={{ background: "var(--card-bg)", border: "1.5px solid var(--input-border)" }}
        >
          <svg
            className="w-4 h-4 flex-shrink-0"
            style={{ color: "var(--muted)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            placeholder="Search your city…"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: "var(--foreground)" }}
            autoComplete="off"
          />
          {searching && (
            <span
              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
              style={{ borderColor: "var(--muted)", borderTopColor: "transparent" }}
            />
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-1 rounded-2xl overflow-hidden z-10 shadow-lg"
            style={{ background: "var(--card-bg)", border: "1.5px solid var(--border)" }}
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => pickSuggestion(s)}
                className="w-full flex flex-col items-start px-4 py-3.5 text-left transition-colors hover:bg-[var(--card-selected)]"
                style={{
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                }}
              >
                <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                  {s.label}
                </span>
                <span className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {s.sublabel}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm" style={{ color: "#E05353" }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || !selected}
        className="w-full font-medium py-3.5 rounded-2xl transition-all disabled:opacity-40"
        style={{ background: "var(--foreground)", color: "var(--background)" }}
      >
        {loading ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
