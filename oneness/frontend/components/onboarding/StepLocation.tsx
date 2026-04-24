"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { playSound } from "@/lib/sounds";

interface Props { onComplete: () => void; }

export default function StepLocation({ onComplete }: Props) {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lon, setLon] = useState<number | undefined>();
  const [geoLoading, setGeoLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Try to auto-detect location on mount
    if ("geolocation" in navigator) {
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLon(pos.coords.longitude);
          setGeoLoading(false);
        },
        () => setGeoLoading(false),
        { timeout: 5000 }
      );
    }
  }, []);

  async function handleSubmit() {
    playSound("tap");
    setError("");
    if (!city || !state) {
      setError("City and state are required");
      return;
    }
    setLoading(true);
    try {
      await api.saveLocation({ city, state, latitude: lat, longitude: lon });
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
      <p className="text-zinc-400 text-sm leading-relaxed">
        We show you people nearby first. Your exact location is never shown to
        others — only your city.
      </p>

      {geoLoading && (
        <p className="text-zinc-500 text-sm flex items-center gap-2">
          <span className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
          Detecting your location…
        </p>
      )}

      <div className="space-y-1.5">
        <label className="text-zinc-400 text-sm">City or town</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Coimbatore"
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-zinc-400 text-sm">State</label>
        <input
          type="text"
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="Tamil Nadu"
          className={inputCls}
        />
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
