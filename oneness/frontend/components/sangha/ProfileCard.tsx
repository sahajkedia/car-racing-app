"use client";
import { ProfileCard } from "@/lib/api";
import { playSound } from "@/lib/sounds";

const PRACTICE_ICONS: Record<string, string> = {
  shambhavi_mahamudra: "🧘",
  surya_kriya: "☀️",
  hatha_yoga: "🌿",
  isha_kriya: "✨",
  general_meditation: "🕊️",
};

interface Props {
  card: ProfileCard;
  onClick: () => void;
}

export default function ProfileCardComponent({ card, onClick }: Props) {
  const age = card.age ?? (card.dob ? computeAge(card.dob) : null);
  const mainPhoto = card.photos.find((p) => p.position === 0) ?? card.photos[0];
  const topPractice = card.daily_practices[0];

  return (
    <button
      onClick={() => { playSound("tap"); onClick(); }}
      className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-zinc-900 group"
    >
      {mainPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mainPhoto.url}
          alt={card.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600">
          No photo
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Score badge */}
      {card.compatibility_score > 0 && (
        <div className="absolute top-2 right-2 bg-amber-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {Math.round(card.compatibility_score * 100)}%
        </div>
      )}

      {/* Practice icon */}
      {topPractice && PRACTICE_ICONS[topPractice] && (
        <div className="absolute top-2 left-2 text-base">
          {PRACTICE_ICONS[topPractice]}
        </div>
      )}

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white font-medium text-sm truncate">
          {card.name}{age ? `, ${age}` : ""}
        </p>
        <p className="text-zinc-300 text-xs truncate">{card.city}</p>
      </div>
    </button>
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
