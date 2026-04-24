"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, Message } from "@/lib/api";
import { playSound } from "@/lib/sounds";
import { useAuthStore } from "@/lib/store";

export default function ThreadPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.profileId as string;
  const { userId } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileId) return;
    api.getThread(profileId)
      .then((res) => {
        setMessages(res.messages);
        api.markRead(profileId).catch(() => {});
      })
      .catch(() => router.push("/auth"))
      .finally(() => setLoading(false));
  }, [profileId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!draft.trim() || sending) return;
    playSound("send");
    setSending(true);
    const content = draft.trim();
    setDraft("");
    try {
      await api.sendMessage(profileId, content);
      const res = await api.getThread(profileId);
      setMessages(res.messages);
    } catch {
      setDraft(content); // restore on error
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 border-b border-zinc-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { playSound("tap"); router.back(); }}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            ←
          </button>
          <h1 className="text-white text-base font-light">{profileId.slice(0, 8)}…</h1>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-zinc-600 text-sm py-10">
            Be the first to say something meaningful.
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.from_profile_id !== profileId;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? "bg-amber-400 text-black rounded-br-sm"
                      : "bg-zinc-800 text-white rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 bg-[#0D0D0D] border-t border-zinc-900 flex gap-3 items-end">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Write something thoughtful…"
          rows={1}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-2.5 text-white text-sm placeholder-zinc-600 resize-none focus:outline-none focus:border-amber-400 transition-colors max-h-32"
        />
        <button
          onClick={sendMessage}
          disabled={!draft.trim() || sending}
          className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-black disabled:opacity-40 flex-shrink-0 hover:bg-amber-300 transition-colors"
        >
          {sending ? (
            <span className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
