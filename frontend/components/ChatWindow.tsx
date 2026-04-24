"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import api, { API_URL } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { Message } from "@/types";
import { useToast } from "@/components/ToastProvider";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ChatWindow({
  conversationId,
  ticketId,
  onResolved,
  readOnly = false,
}: {
  conversationId: string;
  ticketId?: string;
  onResolved?: () => void;
  readOnly?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [peerTyping, setPeerTyping] = useState<string | null>(null);
  const [confirmResolve, setConfirmResolve] = useState(false);
  const { toast } = useToast();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isTypingRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const role = useMemo(() => {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split(".")[1])).role as string;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const fetchConversation = async () => {
      const res = await api.get(`/conversations/${conversationId}`);
      setMessages(res.data.messages ?? []);
    };
    fetchConversation();
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, peerTyping]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io(API_URL, {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_conversation", conversationId);
    });

    socket.on("receive_message", (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on(
      "suggestions",
      (data: { conversationId: string; suggestions: string[] }) => {
        if (data.conversationId === conversationId) {
          setSuggestions(data.suggestions);
          setLoadingSuggestions(false);
        }
      },
    );

    socket.on("suggestions_error", (data?: { message?: string }) => {
      setLoadingSuggestions(false);
      if (data?.message) toast(data.message, "error");
    });

    socket.on(
      "peer_typing",
      (data: { conversationId: string; role: string }) => {
        if (data.conversationId !== conversationId) return;
        setPeerTyping(data.role);
        if (peerTypingTimeoutRef.current) {
          clearTimeout(peerTypingTimeoutRef.current);
        }
        peerTypingTimeoutRef.current = setTimeout(
          () => setPeerTyping(null),
          4000,
        );
      },
    );

    socket.on("peer_stop_typing", (data: { conversationId: string }) => {
      if (data.conversationId !== conversationId) return;
      setPeerTyping(null);
    });

    socket.on("rate_limited", (data: { message: string }) => {
      toast(data.message, "error");
    });

    socket.on("resolve_error", (err: { message: string }) => {
      console.error("Resolve failed:", err);
      toast(`Resolve failed: ${err.message}`, "error");
    });

    socket.on("ticket_resolved", () => {
      setMessages(prev => [
        ...prev,
        {
          id: `system-resolved-${Date.now()}`,
          content: "This ticket has been marked as resolved.",
          senderType: "AI",
          createdAt: new Date().toISOString(),
        },
      ]);
      setResolved(true);
      onResolved?.();
    });

    socket.on("agent_joined", () => {
      setMessages(prev => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          content: "A support agent has joined the chat.",
          senderType: "AI",
          createdAt: new Date().toISOString(),
        },
      ]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const sendMessage = () => {
    if (!input.trim()) return;
    socketRef.current?.emit("send_message", {
      conversationId,
      message: input,
    });
    if (isTypingRef.current) {
      socketRef.current?.emit("stop_typing", { conversationId });
      isTypingRef.current = false;
    }
    setInput("");
    setSuggestions([]);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    const socket = socketRef.current;
    if (!socket) return;

    if (!isTypingRef.current && value.length > 0) {
      socket.emit("typing", { conversationId });
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        socket.emit("stop_typing", { conversationId });
        isTypingRef.current = false;
      }
    }, 1500);
  };

  const resolveTicket = () => {
    if (!ticketId) return;
    setConfirmResolve(true);
  };

  const doResolve = () => {
    setConfirmResolve(false);
    if (!ticketId) return;
    socketRef.current?.emit("resolve_ticket", { ticketId });
  };

  const requestSuggestions = () => {
    setLoadingSuggestions(true);
    setSuggestions([]);
    socketRef.current?.emit("request_suggestions", { conversationId });
  };

  const isMine = (senderType: string) => {
    if (role === "CUSTOMER") return senderType === "CUSTOMER";
    if (role === "AGENT" || role === "ADMIN")
      return senderType === "AGENT" || senderType === "AI";
    return false;
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const sentimentStyles: Record<string, string> = {
    ANGRY: "bg-red-100 border-red-300 text-red-800",
    FRUSTRATED: "bg-orange-100 border-orange-300 text-orange-800",
    POSITIVE: "bg-green-100 border-green-300 text-green-800",
    NEUTRAL: "bg-slate-100 border-slate-300 text-slate-700",
  };

  return (
    <>
      <ConfirmDialog
        open={confirmResolve}
        title="Resolve ticket?"
        message="This will mark the ticket as resolved and end the chat for the customer."
        confirmLabel="Resolve"
        confirmTone="success"
        onConfirm={doResolve}
        onCancel={() => setConfirmResolve(false)}
      />
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div
        ref={scrollRef}
        className="h-[420px] overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50"
      >
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400 mt-8">
            No messages yet
          </p>
        )}
        {messages.map((m, index) => {
          const mine = isMine(m.senderType);
          const isAI = m.senderType === "AI";
          return (
            <div
              key={m.id ?? index}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                  mine
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : isAI
                      ? "bg-violet-50 text-violet-900 border border-violet-200 rounded-bl-sm"
                      : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
                }`}
              >
                <div
                  className={`text-xs font-medium mb-0.5 flex items-center gap-2 ${
                    mine
                      ? "text-indigo-200"
                      : isAI
                        ? "text-violet-600"
                        : "text-slate-500"
                  }`}
                >
                  <span>{m.senderType}</span>
                  {role === "AGENT" &&
                    m.senderType === "CUSTOMER" &&
                    m.sentiment && (
                      <span
                        className={
                          "text-[10px] px-1.5 py-0.5 rounded-full border " +
                          (sentimentStyles[m.sentiment] ??
                            sentimentStyles.NEUTRAL)
                        }
                      >
                        {m.sentiment.toLowerCase()}
                      </span>
                    )}
                </div>
                <div className="text-sm whitespace-pre-wrap break-words">
                  {m.content}
                </div>
                <div
                  className={`text-[10px] mt-1 ${
                    mine
                      ? "text-indigo-200"
                      : isAI
                        ? "text-violet-500"
                        : "text-slate-400"
                  }`}
                >
                  {formatTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        {peerTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2 text-xs text-slate-500 italic shadow-sm">
              {peerTyping === "AGENT"
                ? "Agent is typing..."
                : peerTyping === "CUSTOMER"
                  ? "Customer is typing..."
                  : "..."}
            </div>
          </div>
        )}
      </div>

      {role === "AGENT" && !readOnly && (
        <div className="px-4 py-3 border-t border-slate-200 bg-white space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={requestSuggestions}
              disabled={loadingSuggestions || resolved}
              className="text-sm px-3 py-1.5 rounded-md bg-violet-600 text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
            >
              {loadingSuggestions ? "Thinking..." : "✨ AI suggestions"}
            </button>
            {ticketId && (
              <button
                onClick={resolveTicket}
                disabled={resolved}
                className="text-sm px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {resolved ? "✓ Resolved" : "Resolve ticket"}
              </button>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="block text-left text-sm border border-slate-200 bg-slate-50 rounded-md px-3 py-2 w-full text-slate-800 transition-colors hover:bg-indigo-50 hover:border-indigo-300"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {readOnly ? (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
          This conversation is read-only.
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-slate-200 bg-white flex gap-2">
          <input
            className="flex-1 border border-slate-300 px-3 py-2 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400"
            value={input}
            disabled={resolved}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder={resolved ? "Chat resolved" : "Type a message..."}
          />
          <button
            onClick={sendMessage}
            disabled={resolved || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      )}
    </div>
    </>
  );
}
