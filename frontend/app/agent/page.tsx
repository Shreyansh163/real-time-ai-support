"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";
import api, { API_URL } from "@/lib/api";
import { Ticket } from "@/types";
import ChatWindow from "@/components/ChatWindow";
import AppShell from "@/components/AppShell";

type IncomingMessage = {
  conversationId: string;
  senderType: "CUSTOMER" | "AGENT" | "AI";
};

export default function AgentDashboard() {
  const { loading } = useAuth("AGENT");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [unread, setUnread] = useState<Record<string, number>>({});

  const socketRef = useRef<Socket | null>(null);
  const selectedConvRef = useRef<string | null>(null);
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const baseTitleRef = useRef<string>("");

  useEffect(() => {
    selectedConvRef.current = selectedTicket?.conversationId ?? null;
    if (selectedTicket) {
      setUnread(prev => {
        if (!prev[selectedTicket.conversationId]) return prev;
        const next = { ...prev };
        delete next[selectedTicket.conversationId];
        return next;
      });
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    try {
      const res = await api.get("/tickets/assigned");
      setTickets(res.data);
    } catch (err) {
      console.error("Error fetching tickets", err);
    }
  };

  useEffect(() => {
    if (!loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTickets();
    }
  }, [loading]);

  // Presence + unread tracking socket.
  useEffect(() => {
    if (loading) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket: Socket = io(API_URL, {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("tickets_updated", () => {
      fetchTickets();
    });

    socket.on("receive_message", (msg: IncomingMessage) => {
      // Only customer messages count as unread for the agent.
      if (msg.senderType !== "CUSTOMER") return;
      if (msg.conversationId === selectedConvRef.current) return;
      setUnread(prev => ({
        ...prev,
        [msg.conversationId]: (prev[msg.conversationId] ?? 0) + 1,
      }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      joinedRoomsRef.current.clear();
    };
  }, [loading]);

  // Join a socket room for every assigned ticket so we receive broadcasts
  // for conversations we haven't opened yet.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const ensureJoin = () => {
      for (const t of tickets) {
        if (!joinedRoomsRef.current.has(t.conversationId)) {
          socket.emit("join_conversation", t.conversationId);
          joinedRoomsRef.current.add(t.conversationId);
        }
      }
    };
    if (socket.connected) ensureJoin();
    else socket.once("connect", ensureJoin);
  }, [tickets]);

  // Title-bar flash when there are unread messages.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!baseTitleRef.current) baseTitleRef.current = document.title;
    const total = Object.values(unread).reduce((s, n) => s + n, 0);
    document.title = total > 0 ? `(${total}) ${baseTitleRef.current}` : baseTitleRef.current;
  }, [unread]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      OPEN: "bg-blue-100 text-blue-800 border-blue-200",
      IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
      RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
      CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
    };
    return (
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
          styles[status] ?? styles.CLOSED
        }`}
      >
        {status.replace("_", " ").toLowerCase()}
      </span>
    );
  };

  const totalUnread = Object.values(unread).reduce((s, n) => s + n, 0);

  return (
    <AppShell
      title="Agent Dashboard"
      subtitle={
        totalUnread > 0
          ? `${totalUnread} unread message${totalUnread === 1 ? "" : "s"}`
          : "Your assigned tickets"
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Tickets ({tickets.length})
            </h2>
            <button
              onClick={fetchTickets}
              className="text-xs text-indigo-600 hover:text-indigo-500"
            >
              Refresh
            </button>
          </div>
          {tickets.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-xl p-6 text-center text-sm text-slate-500">
              No assigned tickets.
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map(ticket => {
                const active = selectedTicket?.id === ticket.id;
                const count = unread[ticket.conversationId] ?? 0;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full text-left p-3 rounded-lg border transition-all relative ${
                      active
                        ? "bg-indigo-50 border-indigo-400 shadow-sm"
                        : count > 0
                          ? "bg-white border-rose-300 hover:border-rose-400 shadow-sm"
                          : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono text-slate-500">
                        #{ticket.id.slice(0, 8)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {count > 0 && (
                          <span className="text-xs font-semibold px-1.5 min-w-[20px] h-5 inline-flex items-center justify-center rounded-full bg-rose-600 text-white">
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                        {statusBadge(ticket.status)}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          {selectedTicket ? (
            <div>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Conversation
                </h2>
                <span className="text-xs font-mono text-slate-500">
                  #{selectedTicket.id.slice(0, 8)}
                </span>
                {statusBadge(selectedTicket.status)}
              </div>
              <ChatWindow
                conversationId={selectedTicket.conversationId}
                ticketId={selectedTicket.id}
                onResolved={() => {
                  setSelectedTicket(null);
                  fetchTickets();
                }}
              />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center text-sm text-slate-500">
              Select a ticket to view the conversation.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
