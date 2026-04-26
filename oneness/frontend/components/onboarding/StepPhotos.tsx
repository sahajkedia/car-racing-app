"use client";
import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { playSound } from "@/lib/sounds";

const SLOT_LABELS = [
  "Group picture",
  "Snap you clicked",
  "Through your lens",
  "",
  "",
  "",
];

interface Props {
  onComplete: (profileId: string) => void;
}

export default function StepPhotos({ onComplete }: Props) {
  const [previews, setPreviews] = useState<(string | null)[]>(Array(6).fill(null));
  const [files, setFiles] = useState<(File | null)[]>(Array(6).fill(null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleSelect(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    playSound("tap");
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFiles((prev) => { const next = [...prev]; next[index] = file; return next; });
    setPreviews((prev) => { const next = [...prev]; next[index] = url; return next; });
    setError("");
    e.target.value = "";
  }

  function removePhoto(index: number) {
    playSound("pass");
    setFiles((prev) => { const next = [...prev]; next[index] = null; return next; });
    setPreviews((prev) => { const next = [...prev]; next[index] = null; return next; });
  }

  async function handleUpload() {
    playSound("tap");
    const filled = files.filter(Boolean) as File[];
    if (filled.length < 3) {
      setError("Please add at least 3 photos");
      return;
    }
    setLoading(true);
    try {
      const res = await api.uploadPhotos(filled);
      onComplete(res.profile_id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const filledCount = files.filter(Boolean).length;

  return (
    <div className="space-y-5 mt-4">
      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-3">
        {previews.map((src, i) => (
          <div key={i} className="relative">
            {src ? (
              <div
                className="relative aspect-[3/4] rounded-2xl overflow-hidden"
                style={{ background: "var(--card-selected)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                  style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => { playSound("tap"); inputRefs.current[i]?.click(); }}
                className="w-full aspect-[3/4] rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors"
                style={{ background: "var(--card-bg)", border: "1.5px dashed var(--border)" }}
              >
                <span className="text-2xl font-light" style={{ color: "var(--foreground)" }}>+</span>
                {SLOT_LABELS[i] && (
                  <span className="text-xs text-center leading-tight px-2" style={{ color: "var(--muted)" }}>
                    {SLOT_LABELS[i]}
                  </span>
                )}
              </button>
            )}
            <input
              ref={(el) => { inputRefs.current[i] = el; }}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleSelect(i, e)}
              className="hidden"
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
        Tap to edit, hold and drag to reorder
      </p>

      {error && <p className="text-sm" style={{ color: "#E05353" }}>{error}</p>}

      <p className="text-xs" style={{ color: "var(--muted)" }}>
        {filledCount}/6 photos added · minimum 3 required
      </p>

      <button
        onClick={handleUpload}
        disabled={loading || filledCount < 3}
        className="w-full font-medium py-3.5 rounded-2xl transition-all disabled:opacity-40"
        style={{ background: "var(--foreground)", color: "var(--background)" }}
      >
        {loading ? "Uploading…" : "Continue"}
      </button>
    </div>
  );
}
