export type Sentiment = "POSITIVE" | "NEUTRAL" | "FRUSTRATED" | "ANGRY";

export type Message = {
  id: string;
  content: string;
  senderType: "CUSTOMER" | "AGENT" | "AI";
  sentiment?: Sentiment | null;
  createdAt: string;
};

export type Ticket = {
  id: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  conversationId: string;
};
