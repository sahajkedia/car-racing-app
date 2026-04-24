"use client";

import { useEffect, useState } from "react";
import { Clock3, HeartHandshake, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Pill, SectionCard } from "@/components/ui";
import { blockUser, getInboxRequests, getStoredToken, respondToRequest, type MessageRequest } from "@/lib/api";

export default function RequestsPage() {
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const token = getStoredToken();

  useEffect(() => {
    if (!token) {
      return;
    }
    getInboxRequests(token)
      .then((response) => {
        setRequests(response.requests);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load requests");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  async function handleRespond(requestId: string, accept: boolean) {
    const currentToken = getStoredToken();
    if (!currentToken) {
      return;
    }
    try {
      await respondToRequest(currentToken, requestId, accept);
      setRequests((current) => current.filter((request) => request.id !== requestId));
      setStatusMessage(accept ? "Request accepted and conversation created." : "Request declined.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update request");
    }
  }

  async function handleBlock(senderId: string, requestId: string) {
    const currentToken = getStoredToken();
    if (!currentToken) {
      return;
    }
    try {
      await blockUser(currentToken, senderId);
      setRequests((current) => current.filter((request) => request.id !== requestId));
      setStatusMessage("User blocked.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not block user");
    }
  }

  return (
    <AppShell
      title="Message requests"
      subtitle="This view keeps the first-contact experience respectful. Requests are readable, calm, and easy to evaluate without pressure."
    >
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          {loading ? <SectionCard>Loading inbox requests...</SectionCard> : null}
          {!token ? <SectionCard>Sign in on /auth to view inbox requests.</SectionCard> : null}
          {!loading && requests.length === 0 ? (
            <SectionCard>No pending requests right now.</SectionCard>
          ) : null}
          {requests.map((request) => (
            <SectionCard key={request.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-slate-950">{request.sender_name || "Unknown user"}</h2>
                    <Pill tone="soft">Pending</Pill>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <Clock3 className="size-4" />
                    {new Date(request.created_at).toLocaleString()}
                  </p>
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">{request.intro_message}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => handleRespond(request.id, true)}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                >
                  Accept request
                </button>
                <button
                  onClick={() => handleRespond(request.id, false)}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleBlock(request.sender_id, request.id)}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                >
                  Block
                </button>
              </div>
            </SectionCard>
          ))}
          {error ? <SectionCard className="text-sm text-rose-700">{error}</SectionCard> : null}
          {statusMessage ? <SectionCard className="text-sm text-emerald-700">{statusMessage}</SectionCard> : null}
        </div>

        <div className="space-y-6">
          <SectionCard>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <HeartHandshake className="size-5" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Trust-forward inbox</h3>
                <p className="text-sm text-slate-500">Why this screen feels safer.</p>
              </div>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <li>Readable first messages without dark patterns.</li>
              <li>Actions are clear, separated, and emotionally neutral.</li>
              <li>Block/report can become one tap from here in later iterations.</li>
            </ul>
          </SectionCard>

          <SectionCard className="bg-slate-900 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <ShieldCheck className="size-4" />
              Safety controls
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              This panel can later connect to backend trust signals like request frequency, verified identity, moderation status, and shared community context.
            </p>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
