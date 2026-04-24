"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import ChatWindow from "@/components/ChatWindow";
import AppShell from "@/components/AppShell";

type HistoryItem = {
  id: string;
  createdAt: string;
  ticket: { id: string; status: string } | null;
  lastMessage: {
    content: string;
    senderType: string;
    createdAt: string;
  } | null;
};

export default function CustomerDashboard() {
  const { loading } = useAuth("CUSTOMER");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [viewingPastId, setViewingPastId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get("/conversations/mine");
      setHistory(res.data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    const saved = localStorage.getItem("customer_conversation_id");
    if (saved) setConversationId(saved);
    fetchHistory();
  }, [loading, fetchHistory]);

  const startChat = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await api.post("/conversations");
      const id = res.data.conversationId;
      localStorage.setItem("customer_conversation_id", id);
      setConversationId(id);
      setViewingPastId(null);
      fetchHistory();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to start chat";
      setError(msg);
    } finally {
      setStarting(false);
    }
  };

  const endChat = async () => {
    if (conversationId) {
      try {
        await api.post("/tickets/close", { conversationId });
      } catch (err) {
        console.error("Failed to close ticket", err);
      }
    }
    localStorage.removeItem("customer_conversation_id");
    setConversationId(null);
    fetchHistory();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const activeId = viewingPastId ?? conversationId;
  const statusStyles: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-amber-100 text-amber-800",
    RESOLVED: "bg-emerald-100 text-emerald-800",
    CLOSED: "bg-slate-200 text-slate-700",
  };

  return (
    <AppShell
      title="Customer Support"
      subtitle="Chat with our support team"
      actions={
        conversationId && !viewingPastId ? (
          <button
            onClick={endChat}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
          >
            End chat
          </button>
        ) : viewingPastId ? (
          <button
            onClick={() => setViewingPastId(null)}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ← Back
          </button>
        ) : null
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Past conversations
          </h2>
          {history.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-xl p-4 text-center text-xs text-slate-500">
              Nothing yet.
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(c => {
                const status = c.ticket?.status ?? "CLOSED";
                const isActive = activeId === c.id;
                const isCurrent = conversationId === c.id && !viewingPastId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (isCurrent) return;
                      setViewingPastId(c.id);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isActive
                        ? "bg-indigo-50 border-indigo-400 shadow-sm"
                        : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          statusStyles[status] ?? statusStyles.CLOSED
                        }`}
                      >
                        {isCurrent ? "active" : status.toLowerCase().replace("_", " ")}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                      {c.lastMessage
                        ? `${c.lastMessage.senderType}: ${c.lastMessage.content}`
                        : "No messages"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          {viewingPastId ? (
            <ChatWindow conversationId={viewingPastId} readOnly />
          ) : !conversationId ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center text-3xl">
                💬
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Need help?
              </h2>
              <p className="text-sm text-slate-600 mb-6">
                Start a chat and our team will get back to you right away.
              </p>
              <button
                onClick={startChat}
                disabled={starting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {starting ? "Starting..." : "Start chat"}
              </button>
              {error && (
                <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <ChatWindow
              conversationId={conversationId}
              onResolved={() => {
                localStorage.removeItem("customer_conversation_id");
                fetchHistory();
                setTimeout(() => setConversationId(null), 3000);
              }}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
