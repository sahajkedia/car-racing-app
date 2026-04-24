"use client";
import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { playSound } from "@/lib/sounds";

interface Props {
  onComplete: (profileId: string) => void;
}

export default function StepPhotos({ onComplete }: Props) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    playSound("tap");
    const selected = Array.from(e.target.files ?? []);
    if (selected.length + files.length > 9) {
      setError("Maximum 9 photos allowed");
      return;
    }
    const newPreviews = selected.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    setError("");
  }

  function removePhoto(index: number) {
    playSound("pass");
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    playSound("tap");
    if (files.length < 3) {
      setError("Please upload at least 3 photos");
      return;
    }
    setLoading(true);
    try {
      const res = await api.uploadPhotos(files);
      onComplete(res.profile_id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 mt-4">
      <p className="text-zinc-400 text-sm leading-relaxed">
        Your moodboard — 3 to 9 photos that show who you are. These are the
        first thing someone sees. Make them count.
      </p>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-2">
        {previews.map((src, i) => (
          <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removePhoto(i)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
            >
              ×
            </button>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 bg-amber-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded">
                MAIN
              </span>
            )}
          </div>
        ))}

        {/* Add more slot */}
        {previews.length < 9 && (
          <button
            onClick={() => { playSound("tap"); inputRef.current?.click(); }}
            className="aspect-[3/4] rounded-xl border-2 border-dashed border-zinc-700 hover:border-amber-400 transition-colors flex flex-col items-center justify-center text-zinc-500 hover:text-amber-400"
          >
            <span className="text-2xl">+</span>
            <span className="text-[10px] mt-1">Add photo</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleSelect}
        className="hidden"
      />

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <p className="text-zinc-600 text-xs">
        {files.length}/9 photos selected · minimum 3 required
      </p>

      <button
        onClick={handleUpload}
        disabled={loading || files.length < 3}
        className="w-full bg-amber-400 text-black font-medium py-3 rounded-xl hover:bg-amber-300 transition-colors disabled:opacity-40"
      >
        {loading ? "Uploading…" : "Continue →"}
      </button>
    </div>
  );
}
