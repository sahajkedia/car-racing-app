"use client";
import { useState } from "react";
import { ProfileCard } from "@/lib/api";
import { playSound } from "@/lib/sounds";

const LOOKING_FOR_LABELS: Record<string, string> = {
  date_to_marry_soon: "Ready to marry",
  date_to_marry: "Dating to marry",
  long_term: "Long-term relationship",
  short_term: "Open to explore",
};

const PRACTICE_LABELS: Record<string, string> = {
  shambhavi_mahamudra: "Shambhavi Mahamudra",
  surya_kriya: "Surya Kriya",
  hatha_yoga: "Hatha Yoga",
  bhuta_shuddhi: "Bhuta Shuddhi",
  isha_kriya: "Isha Kriya",
  yogasanas: "Yogasanas",
  chanting: "Chanting",
  general_meditation: "Meditation",
};

const IE_LABELS: Record<string, string> = {
  completed_shambhavi: "Shambhavi initiated",
  completed_ie: "Inner Engineering complete",
  in_progress: "Inner Engineering in progress",
  not_done: "Meditator",
};

interface Props {
  card: ProfileCard;
  onClose: () => void;
  onExpressInterest: () => void;
  onSilentPass: () => void;
}

export default function ProfileDetail({ card, onClose, onExpressInterest, onSilentPass }: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const sortedPhotos = [...card.photos].sort((a, b) => a.position - b.position);
  const age = card.age ?? (card.dob ? computeAge(card.dob) : null);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0D0D0D]">
      {/* Photo carousel */}
      <div className="relative flex-shrink-0 h-[55vh] bg-zinc-900">
        {sortedPhotos.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sortedPhotos[photoIndex]?.url}
            alt={card.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600">
            No photos
          </div>
        )}

        {/* Photo dots */}
        {sortedPhotos.length > 1 && (
          <div className="absolute top-3 left-0 right-0 flex justify-center gap-1">
            {sortedPhotos.map((_, i) => (
              <button
                key={i}
                onClick={() => { playSound("tap"); setPhotoIndex(i); }}
                className={`h-1 rounded-full transition-all ${
                  i === photoIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}

        {/* Tap zones for photo nav */}
        <div className="absolute inset-0 flex">
          <div
            className="flex-1"
            onClick={() => {
              playSound("tap");
              setPhotoIndex((i) => Math.max(0, i - 1));
            }}
          />
          <div
            className="flex-1"
            onClick={() => {
              playSound("tap");
              setPhotoIndex((i) => Math.min(sortedPhotos.length - 1, i + 1));
            }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={() => { playSound("tap"); onClose(); }}
          className="absolute top-4 right-4 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white"
        >
          ×
        </button>

        {/* Score */}
        {card.compatibility_score > 0 && (
          <div className="absolute top-4 left-4 bg-amber-400 text-black text-xs font-bold px-2 py-1 rounded-full">
            {Math.round(card.compatibility_score * 100)}% match
          </div>
        )}

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Scrollable info */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-32">
        {/* Name & basics */}
        <div className="mb-4">
          <h2 className="text-white text-2xl font-light">
            {card.name}{age ? `, ${age}` : ""}
          </h2>
          <p className="text-zinc-400 text-sm mt-0.5">
            {card.city} · {LOOKING_FOR_LABELS[card.looking_for] ?? card.looking_for}
            {card.height_cm ? ` · ${card.height_cm}cm` : ""}
          </p>
        </div>

        {/* About */}
        {card.about_me && (
          <p className="text-zinc-300 text-sm leading-relaxed mb-5">{card.about_me}</p>
        )}

        {/* Tags — hidden for now
        <div className="flex flex-wrap gap-2 mb-5">
          <Tag>{IE_LABELS[card.ie_status] ?? card.ie_status}</Tag>
          {card.daily_practices.map((p) => (
            <Tag key={p}>{PRACTICE_LABELS[p] ?? p}</Tag>
          ))}
          <Tag>{card.diet}</Tag>
        </div>
        */}

        {/* Career */}
        {(card.job_title) && (
          <div className="bg-zinc-900 rounded-xl p-4 space-y-1 mb-4">
            <p className="text-zinc-400 text-xs uppercase tracking-wide">Career</p>
            {card.job_title && <p className="text-white text-sm">{card.job_title}</p>}
          </div>
        )}
      </div>

      {/* Action buttons — fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0D0D0D]/95 backdrop-blur-sm px-5 py-4 flex gap-3 border-t border-zinc-900">
        <button
          onClick={onSilentPass}
          className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:border-zinc-500 transition-colors"
        >
          Pass
        </button>
        <button
          onClick={onExpressInterest}
          className="flex-2 flex-[2] py-3 rounded-xl bg-amber-400 text-black text-sm font-medium hover:bg-amber-300 transition-colors"
        >
          Send a message →
        </button>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full">
      {children}
    </span>
  );
}

function computeAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
