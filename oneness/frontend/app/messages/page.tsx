"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Thread } from "@/lib/api";
import { playSound } from "@/lib/sounds";

export default function MessagesPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getThreads()
      .then((res) => setThreads(res.threads))
      .catch(() => router.push("/auth"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <div className="px-6 pt-8 pb-4 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { playSound("tap"); router.back(); }}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            ←
          </button>
          <h1 className="text-white text-lg font-light">Messages</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 text-sm">
          No conversations yet. Express interest in someone from your Sangha.
        </div>
      ) : (
        <div className="divide-y divide-zinc-900">
          {threads.map((t) => (
            <button
              key={t.other_profile_id}
              onClick={() => { playSound("tap"); router.push(`/messages/${t.other_profile_id}`); }}
              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-zinc-900/50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{t.other_profile_id.slice(0, 8)}…</p>
                <p className="text-zinc-500 text-xs truncate mt-0.5">{t.last_message}</p>
              </div>
              {t.unread > 0 && (
                <span className="flex-shrink-0 bg-amber-400 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {t.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
