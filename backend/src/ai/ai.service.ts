import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { PrismaService } from "../common/prisma/prisma.service";
import { SenderType, Sentiment } from "@prisma/client";

export const AI_USER_EMAIL = "ai-bot@system.local";

@Injectable()
export class AiService {
  private openai: OpenAI;
  private aiUserIdCache: string | null = null;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async getAiUserId(): Promise<string> {
    if (this.aiUserIdCache) return this.aiUserIdCache;
    const user = await this.prisma.user.findUnique({
      where: { email: AI_USER_EMAIL },
    });
    if (!user) {
      throw new Error(
        `AI system user ${AI_USER_EMAIL} not found. Run the seed script.`,
      );
    }
    this.aiUserIdCache = user.id;
    return user.id;
  }

  async generateReplySuggestions(conversationText: string): Promise<string[]> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are a professional customer support agent. Given a conversation transcript, return exactly 3 short, helpful reply suggestions the agent could send next. Respond ONLY with a JSON object of the form {"suggestions": ["...", "...", "..."]}. Each suggestion must be a single plain sentence, no numbering, no markdown.',
        },
        {
          role: "user",
          content: conversationText || "(no messages yet)",
        },
      ],
      temperature: 0.6,
      max_tokens: 300,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
      return list
        .filter((s: unknown): s is string => typeof s === "string")
        .map((s: string) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
    } catch {
      return [];
    }
  }

  async generateReply(conversationText: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a friendly first-line customer support assistant. A human agent will take over soon. Reply concisely (1-3 sentences), acknowledge the customer's issue, and ask any clarifying question that would help the human agent resolve it faster.",
        },
        {
          role: "user",
          content: conversationText || "Customer just opened a new chat.",
        },
      ],
      temperature: 0.6,
      max_tokens: 200,
    });

    return (
      response.choices[0]?.message?.content?.trim() ||
      "Hi! Thanks for reaching out — an agent will be with you shortly."
    );
  }

  async classifySentiment(text: string): Promise<Sentiment | null> {
    if (!text.trim()) return null;
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Classify the customer message emotional tone. Respond ONLY with JSON: {"sentiment": "POSITIVE" | "NEUTRAL" | "FRUSTRATED" | "ANGRY"}.',
          },
          { role: "user", content: text },
        ],
        temperature: 0,
        max_tokens: 20,
      });
      const raw = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      const value = parsed?.sentiment;
      if (
        value === "POSITIVE" ||
        value === "NEUTRAL" ||
        value === "FRUSTRATED" ||
        value === "ANGRY"
      ) {
        return value as Sentiment;
      }
      return null;
    } catch (err) {
      console.error("❌ classifySentiment failed:", err);
      return null;
    }
  }

  async saveAiMessage(
    conversationId: string,
    content: string,
  ) {
    const aiUserId = await this.getAiUserId();
    return this.prisma.message.create({
      data: {
        content,
        senderType: SenderType.AI,
        conversation: { connect: { id: conversationId } },
        sender: { connect: { id: aiUserId } },
      },
    });
  }
}
