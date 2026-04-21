import { CheckCheck, Phone, SendHorizontal, Video } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Pill, SectionCard } from "@/components/ui";

const threads = [
  { name: "Kavya", preview: "That sounds beautiful. I also value slow mornings.", active: true },
  { name: "Meera", preview: "Let us continue after evening prayer.", active: false },
  { name: "Ananya", preview: "I liked your note about meaningful routines.", active: false },
];

const messages = [
  { mine: false, body: "I appreciated your profile. It felt grounded and honest." },
  { mine: true, body: "Thank you. Your note about quiet rituals felt very relatable." },
  { mine: false, body: "Would you be open to talking about what a peaceful partnership means to you?" },
];

export default function ChatPage() {
  return (
    <AppShell
      title="Conversations that feel calm"
      subtitle="The chat experience uses soft contrast and editorial spacing so it feels more like a meaningful conversation than a chaotic messenger."
    >
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-950">Conversations</h2>
            <Pill tone="soft">3 active</Pill>
          </div>
          {threads.map((thread) => (
            <div
              key={thread.name}
              className={`rounded-[24px] border px-4 py-4 ${
                thread.active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <p className="font-semibold">{thread.name}</p>
              <p className={`mt-1 text-sm ${thread.active ? "text-slate-300" : "text-slate-500"}`}>
                {thread.preview}
              </p>
            </div>
          ))}
        </SectionCard>

        <SectionCard className="flex min-h-[680px] flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-[22px] bg-slate-200 text-lg font-semibold text-slate-900">
                KA
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Kavya</h2>
                <p className="text-sm text-slate-500">Aligned values: service, stillness, family</p>
              </div>
            </div>
            <div className="flex gap-3 text-slate-500">
              <button className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white">
                <Phone className="size-4" />
              </button>
              <button className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white">
                <Video className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 py-6">
            {messages.map((message) => (
              <div
                key={message.body}
                className={`flex ${message.mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xl rounded-[26px] px-5 py-4 text-sm leading-7 ${
                    message.mine
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {message.body}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <input
                className="h-14 flex-1 rounded-full bg-white px-5 text-sm outline-none"
                placeholder="Write something thoughtful..."
              />
              <button className="flex size-12 items-center justify-center rounded-full bg-slate-950 text-white">
                <SendHorizontal className="size-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <CheckCheck className="size-4" />
              Message requests are already accepted. This thread can map directly to the backend conversation model.
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
