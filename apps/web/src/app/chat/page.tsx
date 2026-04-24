"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCheck, Phone, SendHorizontal, Video } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Pill, SectionCard } from "@/components/ui";
import {
  getConversations,
  getMessages,
  getStoredToken,
  sendMessage,
  type Conversation,
  type Message,
} from "@/lib/api";

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [composer, setComposer] = useState("");
  const [error, setError] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const token = getStoredToken();

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId),
    [conversations, selectedConversationId],
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    getConversations(token)
      .then((response) => {
        setConversations(response.conversations);
        if (response.conversations[0]) {
          setSelectedConversationId(response.conversations[0].id);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load conversations");
      })
      .finally(() => {
        setLoadingConversations(false);
      });
  }, [token]);

  useEffect(() => {
    if (!token || !selectedConversationId) {
      return;
    }

    getMessages(token, selectedConversationId)
      .then((response) => {
        setMessages(response.messages.slice().reverse());
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load messages");
      });
  }, [token, selectedConversationId]);

  async function handleSendMessage() {
    const currentToken = getStoredToken();
    if (!currentToken || !selectedConversationId || !composer.trim()) {
      return;
    }

    try {
      const created = await sendMessage(currentToken, selectedConversationId, composer.trim());
      setMessages((current) => [...current, created]);
      setComposer("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    }
  }

  return (
    <AppShell
      title="Conversations that feel calm"
      subtitle="The chat experience uses soft contrast and editorial spacing so it feels more like a meaningful conversation than a chaotic messenger."
    >
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <SectionCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-950">Conversations</h2>
            <Pill tone="soft">{conversations.length} active</Pill>
          </div>
          {loadingConversations && token ? <p className="text-sm text-slate-500">Loading conversations...</p> : null}
          {!token ? <p className="text-sm text-slate-500">Sign in on /auth to load conversations.</p> : null}
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setSelectedConversationId(conversation.id)}
              className={`w-full rounded-[24px] border px-4 py-4 text-left ${
                conversation.id === selectedConversationId
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <p className="font-semibold">{conversation.other_display_name}</p>
              <p
                className={`mt-1 text-sm ${
                  conversation.id === selectedConversationId ? "text-slate-300" : "text-slate-500"
                }`}
              >
                Last active {new Date(conversation.last_message_at).toLocaleString()}
              </p>
            </button>
          ))}
        </SectionCard>

        <SectionCard className="flex min-h-[680px] flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-[22px] bg-slate-200 text-lg font-semibold text-slate-900">
                {selectedConversation?.other_display_name.slice(0, 2).toUpperCase() || "--"}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {selectedConversation?.other_display_name || "Select a conversation"}
                </h2>
                <p className="text-sm text-slate-500">Real-time messaging thread</p>
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
            {token && selectedConversationId && messages.length === 0 ? (
              <p className="text-sm text-slate-500">Loading messages...</p>
            ) : null}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === selectedConversation?.other_user_id ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-xl rounded-[26px] px-5 py-4 text-sm leading-7 ${
                    message.sender_id === selectedConversation?.other_user_id
                      ? "border border-slate-200 bg-slate-50 text-slate-700"
                      : "bg-slate-900 text-white"
                  }`}
                >
                  {message.body}
                </div>
              </div>
            ))}
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </div>

          <div className="mt-auto rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <input
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                className="h-14 flex-1 rounded-full bg-white px-5 text-sm outline-none"
                placeholder="Write something thoughtful..."
              />
              <button
                onClick={handleSendMessage}
                className="flex size-12 items-center justify-center rounded-full bg-slate-950 text-white"
              >
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
