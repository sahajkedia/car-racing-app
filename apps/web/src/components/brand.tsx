import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-3 text-sm font-semibold tracking-[0.18em] text-slate-900 uppercase"
    >
      <span className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1e293b,#475569)] text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
        <Sparkles className="size-4" />
      </span>
      Saanjh
    </Link>
  );
}
